# Work request: EXT-SERVICE to INFRA-DATABASE address matching

Status: proposal, partially superseded by a same-session agent-side fix - see "Agent-side fixes
already shipped" below, in particular item 4, before reading the rest of this document. Written
by the eBPF agent team following up on
[#3311](https://github.com/newrelic/entity-definitions/pull/3311) (merged), which made
`EXT-SERVICE-to-DATABASE.stg.yml` accept eBPF-sourced telemetry (`instrumentation.provider:
newrelic-ebpf`) and widened its `eventType` to include `Metric`. That PR fixed the gating
conditions.

**Correction to this document's original analysis (below), found while re-verifying the claims
in this doc against the live code):** the "format mismatch, even hostname-to-hostname" finding
originally in this section was based on a misattributed value. The `ip-192-168-6-253.us-east-2.compute.internal`
FQDN quoted below as eBPF's `server.address` was actually `host.name` (self-identification),
surfaced via a *different* telemetry path (`tcp-metrics.pxl`, host-wide TCP connection metrics) -
not `server.address` on the DB-protocol Span this relationship rule actually reads. Checked
directly against the live scripts: `mysql-spans.pxl`/`postgresql-spans.pxl`/`mssql-spans.pxl`
(the files `extServiceCallsGenericDatabase` actually consumes, since its `eventType` condition
is `Span`-only) never set a `server.address` attribute **at all** - not a format mismatch, an
absence. They also never set `db.system.name` (only the older `db.system`), which independently
blocks the rule's `eventType: Span` + `db.system.name` condition regardless of the address
question. Both gaps are fixed as of item 4 below. The two-reasons framing immediately below is
kept for the historical record of what was originally (and partly incorrectly) diagnosed, but
superseded by item 4's facts.

## Summary (historical framing, see correction above and item 4 below)

`extServiceCallsGenericDatabase` (`relationships/synthesis/EXT-SERVICE-to-DATABASE.stg.yml`)
resolves its target via:
```yaml
target:
  lookupGuid:
    candidateCategory: DATABASE
    fields:
      - field: endpoint
        attribute: server.address
```
This compares the eBPF client's own `server.address` attribute (the address it dialed, as *it*
resolved it) against the `DATABASE` candidate's `endpoint` tag (sourced from `tags.endpoint`/
`tags.nr.endpoint` etc. on the target INFRA entity - for `INFRA-MYSQLNODE`, that tag is a direct
copy of the OTel mysqlreceiver's own `server.address` resource attribute, i.e. whatever the
receiver was configured/resolved to use to reach the database).

Originally diagnosed as two independent mismatches; the second one does not hold as stated (see
correction above):

1. **Representation mismatch.** eBPF's own view of the connection is anchored on the raw IP it
   dialed (`remote_addr`); the INFRA side's `server.address` tag is a receiver-configured
   hostname-shaped string. These are different representations of the same box and have no
   reason to coincide. This part holds: `server.address` was never populated on the DB-protocol
   Span at all (see item 4), so there was nothing hostname-shaped on the eBPF side to even compare.
2. ~~**Format mismatch, even hostname-to-hostname.**~~ Retracted - based on a misattributed
   `host.name` value, not an actual `server.address` observation (see correction above). The
   agent's existing, unmodified `remote_host_name` column (`fetchRemoteHostName()` in
   `source_connector.cc`, untouched by any of the IMDS-based fixes below) resolves this specific
   address via PTR to `ip-192-168-6-253` - the *same* short form `INFRA|MYSQLNODE`'s
   `server.address` tag already uses (confirmed live, see item 4). Whether these actually now
   converge once wired is pending live reconfirmation after item 4 ships.

## Agent-side fixes already shipped (context, not part of this ask)

1. Seven `*-metrics.pxl` scripts (mysql/postgresql/mssql/redis/cassandra/http/mongodb-metrics.pxl)
   were recomputing `remote_host_name` via a buggy UDF path. **Reverted, not fixed** - found this
   session that `extServiceCallsGenericDatabase`'s `eventType: Span` condition means it never
   reads these scripts' `Metric` events at all, so nothing in them can affect this relationship
   either way. These scripts emit real telemetry used elsewhere; they're just irrelevant here.
2. Added an EC2 IMDS-backed self-identification path (`local-hostname`) so the agent's own
   loopback self-connections resolve `host.name` to the authoritative FQDN instead of a PTR
   lookup. Affects `host.name` only, on whichever telemetry path reads it (confirmed: all 16
   application-protocol handlers' `host.name`, plus `tcp-metrics.pxl`'s `host.name` and
   `remote.host.name` via a separate call site in `tcp_stats_connector.cc`). Does **not** reach
   `server.address` on any DB-protocol Span.
3. Extended that self-identification to also cover connections to the instance's own
   non-loopback IP (`local-ipv4`), since a PTR lookup for this VPC's own address does not carry
   the FQDN either (confirmed via `dig -x <instance-ip>` against the actual upstream VPC
   resolver - it returns `ip-<dashed>.`/`ip-<dashed>.local.`, never the `compute.internal` FQDN).
   Same scope caveat as item 2 - `host.name`/`tcp-metrics.pxl`'s `remote.host.name` only.
4. **(New, supersedes the original diagnosis above.)** Added `db.system.name` (literal value
   matching each script's sibling `-metrics.pxl`, e.g. `"mysql"`) and `server.address` (wired to
   the existing `remote_host_name` column - no new resolution logic) to
   `mysql-spans.pxl`/`postgresql-spans.pxl`/`mssql-spans.pxl`. This directly targets
   `extServiceCallsGenericDatabase`'s actual conditions (`eventType: Span`, `db.system.name`,
   `server.address: present`) on the telemetry path it actually reads. Build/deploy verified;
   live Span-attribute confirmation pending as of this writing.

Redis and MongoDB are not covered by item 4 - their own `EXT-SERVICE-to-INFRA-*` relationship
rules are `eventType: Metric` keyed on APM-specific attributes eBPF doesn't produce (see
"Additional issues" and the MongoDB section below); a Span-side fix in their `*-spans.pxl`
scripts wouldn't reach either rule, so none was made.

## The observed 6-value comparison

| | eBPF (`EXT-SERVICE`) | `INFRA|MYSQLNODE` | Agree? |
|---|---|---|---|
| `host.name` (self-identification) | `ip-192-168-6-253.us-east-2.compute.internal` (post agent-side fixes above; confirmed directly for an identical code path on a sibling connection, recommend reconfirming live for MySQL specifically before implementing) | `ip-192-168-6-253.us-east-2.compute.internal` (confirmed live - almost certainly from the OTel Collector's own EC2 resourcedetection processor, which queries the same IMDS data our agent-side fix now also uses) | **Yes** |
| `remote.address` / `server.address` | Previously: absent entirely on the Span (see correction above - not a format mismatch, a missing attribute). As of item 4: wired to `remote_host_name`, which PTR-resolves this address to `ip-192-168-6-253` | `ip-192-168-6-253` (short hostname, receiver-configured) | **Pending live reconfirmation** - the two values are now expected to be identical strings; not yet re-queried live since item 4 shipped |
| `remote.port` / `server.port` | `3306` | `3306` | **Yes** |

`host.name` and `port` already agreed on both sides before this session. Whether `server.address`
now also agrees (pending reconfirmation above) determines how much of Proposal A below is still
needed - see the note at the end of that section.

## Proposal A: match on (`host.name`, `port`) - IMPLEMENTED (uncommitted local changes)

**Status update: implemented**, with one deliberate deviation from the exact shape originally
proposed below - kept for historical record, see the actual diffs cited inline.

- `entity-types/infra-mysqlnode/definition.yml` and `infra-postgresqlinstance/definition.yml`:
  added a bare `host.name: {entityTagName: host.name}` tag alongside the existing
  `server.address`/`server.port` tags, as proposed.
- `entity-types/infra-mssqlinstance/definition.yml`: instead of a separate bare block, extended
  the existing remap's target list: `host.name: {entityTagNames: [server.address, endpoint,
  host.name]}` - same practical effect (host.name now exists as its own tag), different
  mechanism (one source attribute populating three tags instead of two rules).
- `relationships/candidates/DATABASE.stg.yml`: new lookup entry for
  `INFRA-MYSQLNODE`/`POSTGRESQLINSTANCE`/`MSSQLINSTANCE`, `matchingMode: ALL` over **three**
  predicates (`tags.host.name`->`host`, `tags.server.address`->`endpoint`,
  `tags.server.port`->`port`) - stricter than the two-predicate (`host`+`port`) shape originally
  proposed; requires `server.address` to agree too, not just `host.name`+`port`.
- `relationships/synthesis/EXT-SERVICE-to-DATABASE.stg.yml`: `lookupGuid.fields` extended with
  `host`/`host.name` and `port`/`remote_port`, alongside the existing `endpoint`/`server.address`
  field, exactly as proposed.

This only covers the `.stg.yml` (staging) variant, not the prod `EXT-SERVICE-to-DATABASE.yml` -
consistent with this proposal's own "same-host only" limitation being more of a
test/staging-relevant concern than a general-production one.

**This is independent of, and now overlaps with, the agent-side `server.address` fix (item 4
above) for the same-host case** - both the direct `server.address`/`endpoint` match and the new
`host.name`/`remote_port` fields should now succeed for same-host connections; the implemented
version's extra `server.address` predicate in `DATABASE.stg.yml`'s new lookup entry means both
paths are being required together there, which is stricter (and safer) than either alone. Live
UI confirmation of an actual rendered relationship is still pending as of this writing.

## Proposal A (original text, superseded by "IMPLEMENTED" above): match on (`host.name`, `port`) - ready now, narrow scope

This directly uses the two fields that already agree. Precedent for this exact shape already
exists and is shipping: `relationships/candidates/REDIS.yml`'s `INFRA-REDISINSTANCE` lookup uses
`matchingMode: ALL` over two predicates (`tags.server.address` -> `field: endpoint`,
`tags.server.port` -> `field: port`). This proposal is the same structure, substituting
`host.name` for `server.address` as the first field, because `server.address` is exactly the
field proven not to agree.

**Why port must be included, not just host.name:** a single host commonly runs more than one
database (this test box runs MySQL, PostgreSQL, MSSQL, Redis, MongoDB, Cassandra, and DynamoDB
simultaneously). Matching on `host.name` alone would make every client connecting to *any*
service on that host match *every* database candidate sharing that host.name - a wrong-merge,
not a coverage gain. `port` disambiguates which specific service on the shared host.

### Work item 0: verify host.name/server.address/server.port are actually synthesized as tags

Checked directly against the three entity types this relationship rule targets (per its
`db.system.name` condition: MySQL, PostgreSQL, MSSQL), the same way `EXT-SERVICE`'s own
`host.name`/`local_endpoint` tags are declared in
`entity-types/ext-service/definition.stg.yml`'s `ext_service_composite_ebpf_server`/`_client`
rules and consumed by `relationships/candidates/EXTEBPFSERVER.stg.yml`:

| Type | `server.address`/`server.port` tags | `host.name` tag |
|---|---|---|
| `INFRA-MYSQLNODE` | Yes - `entity-types/infra-mysqlnode/definition.yml:47-48` (`entityTagNames: [server.address, endpoint]` / `entityTagName: server.port`) | **No** - not declared anywhere in the file |
| `INFRA-POSTGRESQLINSTANCE` | Yes - `entity-types/infra-postgresqlinstance/definition.yml:123-126` (same shape) | **No** - not declared anywhere in the file |
| `INFRA-MSSQLINSTANCE` | Yes - e.g. `entity-types/infra-mssqlinstance/definition.yml:71-74`, `:177-180`, `:230-233`, `:261-264` (several rule variants, same shape) | **No** - subtler: `infra_mssqlinstance_host_name_metrics_nrfork` (`:28-50`) does read a generic `host.name` attribute (gated on the receiver *not* providing its own `sqlserver.host.name`/`sqlserver.target.host`), but its `tags:` block remaps it straight into `server.address`/`endpoint` (`host.name: {entityTagNames: [server.address, endpoint]}`, `:48-49`) - the raw value is never preserved under its own `host.name` tag name. Other mssql rules key off the receiver-specific `sqlserver.host.name` attribute instead of the generic OTel one entirely. |

So: `server.address`/`server.port` need no new work - they already exist as tags on all three
types, which is why the existing (representation-mismatched) match at least has something to
compare against. `host.name` does not exist as its own tag on any of the three. This is a real
gap, not yet planned anywhere else - **work item**: add it, using the exact pattern already
proven for `EXT-SERVICE` itself:
```yaml
# entity-types/ext-service/definition.stg.yml:348-349 (ext_service_composite_ebpf_server) - reference
tags:
  ...
  host.name:
    ttl: PT4H
```

Concretely, three changes:

1. **Add a `host.name` tag to `INFRA-MYSQLNODE`, `INFRA-POSTGRESQLINSTANCE`, and
   `INFRA-MSSQLINSTANCE`** at the citations above, reading the generic OTel-resourcedetection
   `host.name` resource attribute (confirmed present on the matched datapoint - it is how we
   queried it live earlier in this investigation), not the type-specific `sqlserver.host.name`
   `MSSQLINSTANCE` otherwise uses. For `MYSQLNODE`/`POSTGRESQLINSTANCE`, add directly alongside
   the existing `server.address`/`server.port` tags in their primary OTel-metric rule:
   ```yaml
   tags:
     host.name:
       entityTagName: host.name
     server.address:
       entityTagNames: [server.address, endpoint]
     server.port:
       entityTagName: server.port
   ```
   For `MSSQLINSTANCE`, its rules are more fragmented (multiple variants gated on different
   receiver/fork combinations) and one of them already reads a generic `host.name` attribute
   under a different condition shape (`infra_mssqlinstance_host_name_metrics_nrfork`,
   `:28-50`) - the smallest change there is to add `host.name: {ttl: PT4H}` (bare, not remapped)
   to that rule's existing `tags:` block alongside its current `host.name: {entityTagNames:
   [server.address, endpoint]}` line, rather than inventing a new rule.

2. **Add a new `lookups` entry to `relationships/candidates/DATABASE.stg.yml`** for the same
   entity types, mirroring `REDIS.yml`'s structure exactly:
   ```yaml
   - entityTypes:
       - INFRA-MYSQLNODE
       - INFRA-POSTGRESQLINSTANCE
       - INFRA-MSSQLINSTANCE
     attributes:
       matchingMode: ALL
       predicates:
         - attributeKeys: ["tags.host.name"]
           field: host
         - attributeKeys: ["tags.server.port"]
           field: port
     onMatch:
       onMultipleMatches: RELATE_ALL
     onMiss:
       action: NO_OP
   ```

3. **Extend `EXT-SERVICE-to-DATABASE.stg.yml`'s `lookupGuid.fields`** to also supply the new
   fields, alongside (not replacing) the existing `endpoint` field so the address-based match
   keeps working wherever it already does:
   ```yaml
   target:
     lookupGuid:
       candidateCategory: DATABASE
       fields:
         - field: endpoint
           attribute: server.address
         - field: host
           attribute: host.name
         - field: port
           attribute: remote_port
   ```

**Known limitation - please read before implementing.** This only works because, in this test
environment, the calling process and the database are on the *same host*. The `host.name`
attribute on the eBPF client's own telemetry is always self-referential (the calling process's
own host) - eBPF has no independent way to learn a *remote* database server's hostname beyond
the address-resolution problem described above. So this proposal helps same-host/co-located
deployments (common in on-host or VM-based setups, and in test environments like this one) but
does **not** generalize to a database running on a genuinely different host (e.g. a managed RDS
instance, or a separate DB server). For that case, see Proposal B.

**Update pending live reconfirmation (see table above).** If the existing address-based match
(`server.address` -> `endpoint`) now succeeds on its own for the same-host case once the
agent-side `server.address` wiring (item 4 above) is confirmed live, this proposal becomes
redundant for that same narrow case - both approaches have the identical same-host-only
limitation described above, so neither generalizes further than the other. It would still be
worth doing for robustness/clarity (`host.name`+`port` is a more semantically direct match than
relying on two independent resolvers happening to agree on a hostname string), but it would no
longer be the only way to get same-host matching working. Recommend re-running the live query
before prioritizing this proposal's implementation.

## Proposal B: a shared IP-based tag - needed for genuinely remote databases

For the general case (client and database on different hosts), neither `host.name` nor
`server.address` can be reconciled without a shared key. `remote_addr` (the raw IP eBPF dialed)
is always known and never a placeholder; the INFRA side has nothing IP-shaped to match it
against today for `MYSQLNODE`/`POSTGRESQLINSTANCE`/`MSSQLINSTANCE` (confirmed - no `ip`-named
tag exists on any of them, unlike e.g. GCP Cloud SQL, whose `tags.gcp.privateIpAddress`/
`tags.gcp.publicIpAddress` are already wired into this exact `DATABASE` candidate via
`matchingMode: ANY`).

The ask: have the on-host/OTel integration that populates `server.address` also resolve and
report the database's actual IP as a separate tag, then add it to `DATABASE.stg.yml`'s existing
`matchingMode: ANY` predicate list for `MYSQLNODE`/`POSTGRESQLINSTANCE`/`MSSQLINSTANCE` -
the same pattern already proven for GCP Cloud SQL, just extended to the generic on-host path.
This is a larger ask (requires a change on the monitoring-integration side, likely owned by
Database Integrations) and is not blocked on anything in this document; it can proceed
independently and in parallel with Proposal A.

## Related, separately-flagged gap (not part of this ask): MongoDB

`EXT-SERVICE-to-INFRA-MONGODB_INSTANCE.stg.yml`'s three rules gate on
`metricName anyOf: ["apm.service.datastore.operation.duration"]` or
`["apm.service.transaction.overview"]`. The eBPF agent's `mongodb-metrics.pxl` emits
`db.client.operation.duration` (current OTel semconv name) - none of the three rules' conditions
match, so the relationship cannot evaluate at all for eBPF-sourced MongoDB telemetry, independent
of any hostname/address question. This was already noted as an open question in
`docs/relationships/ext-service-to-infra-protocols.md` and is a metric-naming gap, not an
address-matching one - flagging here for completeness, not proposing a fix in this document.

## Additional issues found reviewing #3311 more broadly

Three more problems, found while checking whether the DATABASE pattern above generalizes to the
other entity types #3311 touched. All verified directly against the merged files (local `main`
was 13 commits behind `origin/main` when this review started; pulled before reading anything
below).

### Stale rule names in `EXT-SERVICE-to-INFRA-REDISINSTANCE.stg.yml`

Both rules in this file are named `apmCallsOtelRedisInstance` and `apmCallsOtelRedisInstance2`,
but both now also gate on `instrumentation.provider anyOf: ["opentelemetry", "newrelic-ebpf"]` -
i.e. they serve `EXT-SERVICE`/eBPF telemetry too, not just APM/OTel. The names predate that
extension and are now misleading about what actually triggers them. The rules work correctly;
only the names are wrong. Recommend renaming to something like `extServiceCallsRedisInstance` /
`extServiceCallsRedisInstance2` (or equivalent) to match the `ext...` naming convention used
elsewhere in this same PR (`extServiceCallsGenericDatabase`, `extServiceCallsAzureRedisCache`).

### Redis has the same representation-mismatch risk as the DATABASE case, via a different (riskier) mechanism - IMPLEMENTED (uncommitted local changes)

**Status update: implemented**, matching the fix proposed below exactly:
- `relationships/synthesis/EXT-SERVICE-to-INFRA-REDISINSTANCE.stg.yml`: both rules renamed
  (`apmCallsOtelRedisInstance`/`2` -> `extServiceCallsRedisInstance`/`2`). The second rule's
  target changed from the risky `buildGuid` (hash, no `onMiss`) to `lookupGuid` against the new
  `REDIS` candidateCategory lookup block, with three fields: `host`/`host.name`,
  `endpoint`/`server.address`, `port`/`server.port`.
- `relationships/candidates/REDIS.yml`: new lookup entry for `INFRA-REDISINSTANCE`,
  `matchingMode: ALL` over the same three predicates (`tags.host.name`, `tags.server.address`,
  `tags.server.port`).

Live UI confirmation of an actual rendered relationship is still pending as of this writing.
The original analysis (below) is kept for historical record.

`apmCallsOtelRedisInstance2`'s target is not `lookupGuid` against a candidate - it's `buildGuid`,
hashing `server.address + ":" + server.port` (`FARM_HASH`) to construct the target guid directly:
```yaml
target:
  buildGuid:
    account: {attribute: accountId}
    domain: {value: INFRA}
    type: {value: REDISINSTANCE}
    identifier:
      fragments: [{attribute: server.address}, {value: ":"}, {attribute: server.port}]
      hashAlgorithm: FARM_HASH
```
This exactly replicates `infra_redisinstance_composite`'s own `compositeIdentifier`
(`entity-types/infra-redisinstance/definition.yml:199-210`), which is correct in principle - but
it means eBPF's `server.address` must be the *exact same string* as the OTel redisreceiver's own
`server.address` for the hash to land on the real entity's guid. This is the identical
representation risk documented above for MySQL (not independently re-verified live for Redis in
this pass, but structurally the same class of problem: both values are receiver/resolver-specific
hostname strings with no shared source of truth). It is arguably worse than the DATABASE case's
`lookupGuid`: a hash mismatch here doesn't miss gracefully (`NO_OP`) - the rule's `buildGuid` just
doesn't resolve to the real entity (`buildGuid` has no `onMiss`), with none of the `matchingMode:
ANY` fallback flexibility `lookupGuid` offers.

The good news: unlike `MYSQLNODE`, `host.name` is *already* a declared tag on `REDISINSTANCE`
across all of its OTel-sourced synthesis rules (`entity-types/infra-redisinstance/definition.yml`,
e.g. lines 34-35, 233-234). It's simply not reachable from `EXT-SERVICE` today - the only existing
path to the `REDIS` candidate category's `INFRA-REDISINSTANCE` lookup block (which already
supports `matchingMode: ALL` over `tags.server.address` + `tags.server.port`, see
`relationships/candidates/REDIS.yml:24-32`) is `APM-APPLICATION-to-REDIS.yml`, not anything
`EXT-SERVICE`. No new tag needed here - the fix is a new `EXT-SERVICE`-sourced relationship rule
(`lookupGuid`/`candidateCategory: REDIS`, not `buildGuid`) plus a new `ALL`-matching lookup block
for `host.name` + `server.port` on `REDISINSTANCE` in `REDIS.yml`, exactly mirroring Proposal A
above.

### Nginx: the `.stg` entity tag exists, but eBPF's own attribute feeding it is still unfixed

Initially looked like `relationships/candidates/NGINXSERVER.stg.yml`'s Path B
(`attributeKeys: ["tags.nginx.server.address"]`) matched a tag that doesn't exist anywhere -
`entity-types/infra-nginxserver/definition.yml` (prod) only ever declares `nginx.server.endpoint`,
never `nginx.server.address`. That would make Path B dead for everyone, not just eBPF. Checked the
`.stg.yml` entity variant before concluding that, though, and it does declare `nginx.server.address`
as both identifier and tag (`entity-types/infra-nginxserver/definition.stg.yml:225-390`) - a
real, reachable tag, just staging-only, correctly paired with the staging-only relationship rule.
Not a bug; retracting that concern.

What *is* a real problem: `otelExtServiceCallsNginxServerByAddressStg`/
`ebpfExtServiceCallsNginxServerByAddressStg` both require `metricName startsWith: "http.client."`,
which means the eBPF-side attribute feeding this match comes from `http-metrics.pxl` - and that
script's `server.address` was never included in the Fix 1 cleanup done on the other seven
`*-metrics.pxl` scripts. It is still the raw connection IP, not a resolved hostname (this was
already flagged, separately, in `docs/relationships/ext-service-to-infra-protocols.md`'s own
notes: "`http-metrics.pxl`'s existing `server.address` is the raw connection IP, not the resolved
hostname... so even with a detector, hostname-pattern matching against it would still fail until
that's also fixed"). So applying the same `remote.host.name == host.name` convention proposed
above for nginx needs that agent-side fix first - otherwise `server.address` here is an IP being
compared against the receiver's own (hostname-shaped, per the `.stg` entity's rules) value, the
exact representation mismatch described for MySQL, just not yet even hostname-to-hostname.

One point worth confirming live rather than assuming: the test fixtures under
`entity-types/infra-nginxserver/tests/Metric.stg.json` show `nginx.server.address` sometimes
populated with a bare IP (`"10.10.49.147"`), not a hostname. If that holds in a real deployment
too, comparing eBPF's raw `remote_addr` against this tag directly (no hostname resolution needed
on either side) might be simpler and more reliable than the hostname-based approach - but this is
from test fixtures, not a live-verified receiver behavior, so flagging as worth checking rather
than asserting. No `host.name` tag exists on `NGINXSERVER` in either variant (unlike
`REDISINSTANCE`), so a host.name-based alternative would need the same new-tag treatment proposed
for `MYSQLNODE` above if the IP-based path doesn't pan out.
