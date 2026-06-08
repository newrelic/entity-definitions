# Network Topology — Entity & Relationship Synthesis Design

**Date:** 2026-06-05
**Status:** Draft for review
**Owner team:** Network Monitoring

## 1. Goal

Synthesize network device entities and the relationships between them so that a
**network topology** (which device connects to which) can be explored natively in New
Relic using entities and relationships. Two telemetry sources feed the *same* topology,
unified by MAC address:

1. A custom **`Networking`** event (§2) — vendor integration reporting AP/switch/gateway
   connections.
2. **LLDP over SNMP** via Kentik `ktranslate`, arriving as `Metric` data (§7).

The design keeps both sources on one MAC-keyed model and one shared candidate, so the
same physical device is a single entity regardless of which source observed it.

## 2. Source data — the `Networking` event

(The second source, LLDP/SNMP, is described in §7.)


Each `Networking` event represents one **source device** (an AP, switch, or gateway)
and one observed **connection** from that device to another device.

| Attribute     | Belongs to | Description                                  |
|---------------|------------|----------------------------------------------|
| `vendor`      | source     | Device vendor                                |
| `vendorOrgId` | source     | Vendor-side organization id                  |
| `networkId`   | source     | Network the source device belongs to         |
| `deviceType`  | source     | `ap` \| `switch` \| `gateway` (lowercase)    |
| `deviceName`  | source     | Human-readable device name                   |
| `deviceId`    | source     | Vendor device id                             |
| `model`       | source     | Hardware model                               |
| `mac`         | source     | Source device MAC — **device identity**      |
| `entity.guid` | source     | Pre-computed GUID of the **source** device; equals the GUID entity synthesis builds from `mac` (§6.5). Read directly via `extractGuid` for the relationship source. |
| `port`        | source     | Source-side port of the connection           |
| `dstMac`      | target     | MAC of the device on the other end           |
| `dstPort`     | target     | Target-side port of the connection           |

All attributes except `dstMac` / `dstPort` describe the **source** device. The event
**carries `entity.guid`** for the source device (it is not the target's GUID — the target
is only known by `dstMac`).

## 3. Decisions (locked)

| Decision            | Choice                                                              |
|---------------------|---------------------------------------------------------------------|
| Device identity     | **`mac` only** (no vendor/org in the identifier)                    |
| Entity granularity  | **Option B — one entity type per device type** (`NETWORK_AP`, `NETWORK_SWITCH`, `NETWORK_GATEWAY`) |
| Topology scope      | **Device ↔ device only** (no network/site container entity)        |
| Destination devices | **Mixed** — some are monitored, some not; no placeholder for now    |
| GUID domain         | **`INFRA`**                                                         |
| `deviceType` values | `ap` / `switch` / `gateway` (lowercase)                            |
| Ingest origin       | **Event API**                                                      |
| Identifier encoding | **`encodeIdentifierInGUID: false`** — raw `mac` in the GUID (so the producer can compute the GUID without hashing) |
| Source GUID (Networking) | **`extractGuid` on the event's `entity.guid`** (§2) — the event carries it; it must equal the synthesized GUID (§6.5) |
| Target GUID (Networking) | **`lookupGuid`** via the `NETWORK_DEVICE` candidate, matched by `mac` tag |
| Second data source  | **LLDP/SNMP via Kentik `ktranslate`** (`Metric`), joined to the same model by MAC (§7) |
| LLDP device identity| **chassis MAC** (collect `lldpLocChassisId`); type from LLDP capabilities (hybrid) |
| LLDP typing fallback| `deviceType` **absent** → generic **`NETWORK_DEVICE`** via a `present: false` rule (no ingest default; omit, don't blank) (§7.3/§7.4) |
| LLDP source GUID    | **`buildGuid`** (4 rules: `switch`/`gateway`/`ap` by value + generic via `deviceType present: false`) **+ a `lookupGuid`-by-`mac` twin per rule** for robustness; needs local MAC on the row (§7.5) |
| LLDP target GUID    | **`lookupGuid`** by neighbor MAC (then `hostname`) — `buildGuid` not safe (neighbor type unknown/may differ across sources, §7.5) |
| Host leaves         | **Linked to `INFRA-HOST`, device→host only** — candidate includes `INFRA-HOST`, matched by `mac` (primary) + `hostname` (fallback); hosts carry explicit `deviceType: host` so they never originate edges (§7.3/§7.5) |
| Candidate keys      | **`mac`** (primary) + **`hostname`** (fallback, mainly for `INFRA-HOST`); the `ipAddress` predicate was removed |

## 4. The constraint that shapes the whole design

A New Relic GUID is `account | domain | type | identifier`. For a **relationship**, the
synthesis engine must resolve **both** the source and the target GUID from a **single**
`Networking` event.

- The **source** carries full metadata (`vendor`, `deviceType`, `mac`, …) **and its own
  `entity.guid`** (§2). The relationship reads that GUID directly with `extractGuid`; it
  must equal the GUID entity synthesis builds from `mac` (see Section 6.5).
- The **target** carries only `dstMac` (+ `dstPort`). We do **not** know the
  destination's `deviceType` or `vendor`.

Because we chose **Option B** (device type encoded in the entity type), the target's
type — `NETWORK_AP` vs `NETWORK_SWITCH` vs `NETWORK_GATEWAY` — is unknowable from the
event. Therefore the target GUID **cannot** be built with `buildGuid` (which needs a
concrete `type`). The target must instead be resolved with `lookupGuid` against a
**candidate** that searches the network device types by a `mac` tag (§6.2).

This single fact drives Section 6: one candidate (MAC → device, across the network device
types — see §6.2) plus one relationship rule (source = `extractGuid` on the event's
`entity.guid` (§2),
target = `lookupGuid` by `dstMac`). The source could *also* be resolved without
`entity.guid` (via `buildGuid` per device type, or `lookupGuid` by `mac`); for the
`Networking` event we use the `entity.guid` it already carries — its trade-offs are in
Section 6.5.

## 5. Entity synthesis rules

Three entity types, one per device type. They are identical except for the `type` and
the `deviceType` condition. Identity is **`mac` only**.

Every device **must** expose a `mac` tag — that tag is what the candidate in Section 6
matches against `dstMac` to resolve the other end of a connection. Without it, no
topology relationships can form.

`entity-types/infra-network_switch/definition.yml`:

```yaml
domain: INFRA
type: NETWORK_SWITCH
synthesis:
  rules:
    - identifier: mac
      name: deviceName
      encodeIdentifierInGUID: false
      conditions:
        - attribute: eventType
          value: Networking
        - attribute: deviceType
          value: switch
        - attribute: mac
          present: true
      tags:
        mac:
          entityTagName: mac
        vendor: {}
        vendorOrgId: {}
        networkId: {}
        deviceId: {}
        model: {}
        deviceType: {}
goldenTags:
  - vendor
  - model
  - deviceType
  - networkId
ownership:
  primaryOwner:
    teamName: "Network Monitoring"
```

`infra-network_ap/definition.yml` and `infra-network_gateway/definition.yml` are the
same with `type: NETWORK_AP` / `NETWORK_GATEWAY` and `deviceType` condition `ap` /
`gateway` respectively.

**Notes**
- `name: deviceName` makes the device name the entity display name.
- **`encodeIdentifierInGUID: false`** puts the raw `mac` straight into the GUID
  identifier (legal because a MAC is short — well under the 50-char, printable-ASCII
  identifier limit). This is deliberate: the producer must compute the *same* GUID to
  populate `entity.guid` (Section 6.5), and a raw identifier means plain string
  concatenation + base64 — **no FARM_HASH to replicate**.
- The `mac` value must be reported in a **consistent format** by the integration. The
  entity GUID is derived from the raw `mac` attribute (entity synthesis does not
  normalize it), so inconsistent casing/separators would both create duplicate entities
  **and** break the producer's `entity.guid` (it must use the identical `mac` string).
- Per-type entities allow per-type golden metrics, dashboards, and icons later — the
  main benefit of Option B over a single generic type.

## 6. Relationship synthesis — candidate + rule

### 6.1 Why the target needs a candidate (and `buildGuid` can't be used)

To create a relationship the engine needs **two GUIDs**: source and target. From a
single `Networking` event:

- **Source** is easy — the event carries the emitter's own GUID as `entity.guid` (§2), so
  we grab it with `extractGuid`.
- **Target** is the problem — we only have `dstMac`. A GUID is
  `account | domain | type | identifier`. We have the identifier (`dstMac`) and the
  domain (`INFRA`), but **we do not know the `type`**: the event never says whether
  `dstMac` is an AP, a switch, or a gateway. Because we chose Option B (type encoded in
  the entity type), `buildGuid` is impossible — it has no `type` to put in.

So we cannot *construct* the target GUID; we have to **find** it. That is exactly what a
candidate does: it lets us say "find the existing device entity whose `mac` tag equals
this `dstMac`, whatever its type is."

### 6.2 The candidate definition

`NETWORK_DEVICE` is the candidate **category** — a reusable "search recipe." Following the
repo convention of reusing an entity type as the candidate type, the category
**deliberately shares the name of the generic `NETWORK_DEVICE` entity type** (§7.4). It
spans every network device type **and `INFRA-HOST`** (so device→host links resolve, §7.5).

`relationships/candidates/NETWORK_DEVICE.yml`:

```yaml
category: NETWORK_DEVICE
lookups:
  - entityTypes:                       # only search these types (efficiency + correctness)
      - domain: INFRA
        type: NETWORK_AP
      - domain: INFRA
        type: NETWORK_SWITCH
      - domain: INFRA
        type: NETWORK_GATEWAY
      - domain: INFRA
        type: NETWORK_DEVICE           # generic fallback type (§7.4)
      - domain: INFRA
        type: HOST                     # existing INFRA-HOST, for device→host links (§7.5)
    tags:
      matchingMode: ANY
      predicates:
        - tagKeys: ["mac"]                    # primary key — match the `mac` tag...
          field: mac                          # ...against the `mac` field supplied by the lookup
        - tagKeys: ["hostname", "host.name"]  # fallback, mainly to match INFRA-HOST by name (§7.5)
          field: hostname                     # MAC stays primary; confirm exact host name tag key
    onMatch:
      onMultipleMatches: RELATE_ALL
    onMiss:
      action: NO_OP
```

(The generic type, the `INFRA-HOST` entry, and the `hostname` predicate support the LLDP
source and host-linking in §7; the `Networking` rule uses only the `mac` field.)

### 6.3 How the two pieces join, and the runtime flow

Two pieces work together:

- **Piece 1 — the candidate definition** (above): the reusable search recipe. It
  declares the `NETWORK_DEVICE` category and says: *to find one, search the candidate's
  entity types (§6.2) and match the input against their `mac` tag.*
- **Piece 2 — the `lookupGuid` block in the relationship rule** (Section 6.4): the place
  that *uses* the recipe, feeding it the actual `dstMac` value at runtime.

The join is the `field` name: the relationship rule sets `field: mac = dstMac`, and the
candidate's predicate compares that `mac` field against each entity's `mac` **tag**.
**This is why every device entity must carry a `mac` tag (Section 5) — it is the index
the lookup searches.**

**Step-by-step.** Switch **A** (`mac = AA:AA`) reports it is connected to device **B**
(`dstMac = BB:BB`); AP **B** (`mac = BB:BB`) has already reported its own events.

1. Switch A's `Networking` event arrives carrying `entity.guid` (§2). Entity synthesis
   creates/updates entity **A** (`NETWORK_SWITCH`, tag `mac=AA:AA`).
2. The relationship rule matches (`eventType=Networking`, `dstMac` present).
3. **Source** resolves immediately: `extractGuid(entity.guid)` → GUID of A. (This equals
   A's synthesized GUID *only because* the producer used the same domain/type/`mac`.)
4. **Target** triggers the lookup: "run the `NETWORK_DEVICE` search with `mac = BB:BB`."
5. The engine scans the candidate's entity types (§6.2) for one whose `mac` tag = `BB:BB`.
   It finds entity **B** (an AP) — **its type is discovered by the search, not taken from
   the event.**
6. `onMatch` → relationship created: **A `CONNECTS_TO` B**.
7. When B's own event later fires with `dstMac = AA:AA`, the same flow produces
   **B `CONNECTS_TO` A** (the reverse edge).

If at step 5 nothing matches (B is an unmonitored printer/phone), `onMiss: NO_OP` → no
edge is created, consistent with the "mixed destinations" decision. Switching to
`CREATE_UNINSTRUMENTED` would instead mint a placeholder `UNINSTRUMENTED-NETWORK_DEVICE`
entity so the unknown neighbor still appears in the topology.

**The two knobs.**
- `onMatch.onMultipleMatches` — what to do if several entities share that MAC.
  `RELATE_ALL` links to all of them; `DISCARD_ALL` treats it as ambiguous and links to
  none. MACs should be unique, so this is mainly a safety valve.
- `onMiss.action` — what to do when nothing matches: `NO_OP` (drop) vs
  `CREATE_UNINSTRUMENTED` (mint a placeholder).

**Timing subtlety.** Only the **target** lookup depends on the other entity already
existing. If A's event arrives before B has ever reported, B is not in the index yet →
no edge on that pass; it forms once B has been synthesized and A reports again (well
within the `PT75M` `expires` window, since devices re-report frequently). The **source**
has no such dependency here — its GUID comes straight from `entity.guid` on the event.
This is the "relationship timing" limitation in Section 9.

In one line: **the candidate is a MAC-indexed search across the device types it covers
(§6.2) that substitutes for the `buildGuid` we cannot do, because the connection event
tells us the destination's MAC but not its type.**

### 6.4 Relationship rule — `CONNECTS_TO`

`relationships/synthesis/INFRA-NETWORK_DEVICE-to-INFRA-NETWORK_DEVICE.yml`:

```yaml
relationships:
  - name: networkDeviceConnectsToNetworkDevice
    version: "1"
    origins:
      - Event API
    conditions:
      - attribute: eventType
        anyOf: ["Networking"]
      - attribute: dstMac
        present: true
    relationship:
      expires: PT75M
      relationshipType: CONNECTS_TO
      source:
        extractGuid:
          attribute: entity.guid
      target:
        lookupGuid:
          candidateCategory: NETWORK_DEVICE
          fields:
            - field: mac
              attribute: dstMac
```

**Why this shape**
- **Source = `extractGuid` on `entity.guid`**: the event carries the emitter's own GUID
  (§2). This is type-agnostic, so we need **one** rule instead of three per-source-type
  rules. The trade-off is that `entity.guid` must match the synthesized GUID (Section 6.5).
- **Target = `lookupGuid`**: the only option, since the target type is unknown from the
  event (Sections 4 and 6.1). The candidate matches by MAC; tag matching is
  case-insensitive, so `dstMac` casing does not have to match the stored `mac` tag
  exactly.
- **Direction & bidirectionality**: each rule firing creates a directed
  `source CONNECTS_TO target` edge. Because both endpoints emit their own `Networking`
  events, the reverse edge is created from the other device's event. Seeing edges in
  both directions for a physical link is expected.
- **File naming** follows the loose `<TYPE>-to-<TYPE>` convention; `NETWORK_DEVICE`
  reflects the generic device-to-device nature of the link (the actual entity types are
  the three `NETWORK_*` types resolved via the candidate).

### 6.5 The `entity.guid` on the event must equal the synthesized GUID

The `Networking` event **carries `entity.guid`** for the source device (§2), and the
relationship resolves the source with `extractGuid` on it. For that to point at the right
entity, `entity.guid` must be **byte-for-byte equal** to the GUID that entity synthesis
(Section 5) creates for the same device. If they differ, the source half of every
relationship points at a different or non-existent entity. Whoever populates `entity.guid`
(the integration/producer) must therefore compute it exactly as below.

**How to compute it.** A GUID is the URL-safe base64 (no padding) of four pipe-delimited
segments — `accountId | domain | type | identifier`:

```
entity.guid = base64url_nopad( "{accountId}|INFRA|{TYPE}|{mac}" )
```

where:
- `{accountId}` — the account the event reports to.
- `INFRA` — the fixed domain.
- `{TYPE}` — `NETWORK_AP`, `NETWORK_SWITCH`, or `NETWORK_GATEWAY`, derived by the
  producer from `deviceType` (`ap`/`switch`/`gateway`).
- `{mac}` — the **raw** `mac` value, identical to the `mac` attribute used for synthesis.
  No hashing, because the entity uses `encodeIdentifierInGUID: false` (Section 5).

Example: `mac=AA:BB:CC:DD:EE:FF`, account `12345`, a switch →
`base64url_nopad("12345|INFRA|NETWORK_SWITCH|AA:BB:CC:DD:EE:FF")`.

**Why this is the chosen trade-off.** It keeps the relationship to a **single** rule (no
per-type `buildGuid` rules, no source-side candidate lookup). The cost is **coupling**:
the producer now hard-codes our domain, the `deviceType → TYPE` mapping, the `mac`
identifier, and the no-hash encoding. Any future change to identity (e.g. moving to
`vendor:org:mac`, switching to `encodeIdentifierInGUID: true`, or changing the domain)
must be rolled out to the producer **in lockstep**, or topology links silently break.

**Mitigations / things to verify in implementation:**
- Keep the identifier raw and simple (done — `mac` only, no hash) so the producer's
  computation stays trivial.
- Add a validation/canary that asserts a sample event's `entity.guid` decodes to
  `accountId|INFRA|NETWORK_*|mac` and matches the synthesized entity.
- If this coupling proves too fragile in practice, fall back to **source `buildGuid`**
  (three per-`deviceType` rules) or **source `lookupGuid` by `mac`** (single rule, but
  the source edge waits for the source entity to be indexed). Both avoid `entity.guid`
  entirely.

## 7. Second data source — LLDP/SNMP (Kentik) and how it joins

A second, independent source describes the same physical topology: **LLDP** neighbor data
collected over **SNMP** by Kentik `ktranslate` and sent to New Relic as **`Metric`** data
points (`metricName` like `kentik.snmp.lldpRemSysName`, `kentik.snmp.lldpLocPortId`). It
must fold into the *same* topology built from the `Networking` event.

> ## ⛔ HARD BLOCKER — the source device's own MAC must be in the telemetry
>
> This entire LLDP design depends on **each device reporting its own chassis MAC**
> (`lldpLocChassisId`). The raw LLDP RemTable data **does not contain it** — a RemTable
> row carries only the *neighbor's* MAC (`lldpRemChassisId`), plus the reporting device's
> name and IP.
>
> **If the source device's own MAC is not present in the telemetry, this does not work
> at all:**
> - **No MAC-based identity** → the LLDP device cannot be given the same GUID as its
>   `Networking` counterpart → **the two sources never unify** (the whole point of §7).
> - **No source endpoint for relationships** → the `source` side of every LLDP
>   `CONNECTS_TO` cannot be resolved by MAC (see §7.5).
>
> Therefore, before any of §7 can be implemented, the SNMP collection **must** be changed
> to:
> 1. collect **`lldpLocChassisId`** (the device's own chassis MAC) for entity identity, and
> 2. **stamp that local chassis MAC onto every RemTable data point** so the relationship
>    source resolves by MAC.
>
> There is **no fallback that preserves the join** — the IP/hostname options mentioned
> later (§7.5) are *degraded* and still require the MAC-keyed entity to exist first. This
> is a prerequisite on the data producer, not something the entity definitions can work
> around. **Confirm this is feasible before proceeding.**

### 7.1 The join key is the MAC — so the existing candidate already does it

LLDP identifies a neighbor by its **chassis MAC** (`lldpRemChassisId`, e.g.
`0c:fe:8b:63:00:00`) — the same kind of identifier as the `Networking` event's `mac`.
Since identity is MAC-only, **the same physical device gets the same GUID regardless of
source**, and an LLDP relationship resolves its endpoints through the **same
`NETWORK_DEVICE` candidate** (§6.2). The candidate *is* the join; no new join machinery.

```
LLDP RemTable row:  device_name="OVS-1"  lldpRemChassisId="0c:fe:8b:63:00:00" (→ router)
                                   │
              target = lookupGuid(NETWORK_DEVICE, mac = lldpRemChassisId)
                                   │
       resolves to the router entity whether it came from the Networking
       event or from LLDP — same MAC ⇒ same entity ⇒ one unified topology.
```

### 7.2 RemTable is enough; LocTable is only port metadata

- **RemTable** ("who sees whom") gives, per neighbor: the reporting `device_name` /
  `src_addr`, the neighbor `lldpRemChassisId` (MAC) and `lldpRemSysName` (hostname), and
  `Index` = `timeMark.portNum.index`. This is enough for the edge's **target** (neighbor
  MAC); the edge's **source** still requires the reporting device's own MAC to be stamped
  onto the row — see the **⛔ blocker** above. ("Enough" here means *vs. LocTable* — we
  don't need the LocTable port join, not that RemTable is self-sufficient.)
- **LocTable** only maps `locIndex → source_port` (interface names like `eth0`/`ether1`).
  Those are **link metadata**, and relationship edges can't carry metadata (§9). So
  **LocTable is not used for synthesis** — only for richer visualization later. This is a
  welcome simplification: we never have to perform the RemTable→LocTable port join for
  topology purposes.

### 7.3 Identity & typing for LLDP devices (hybrid)

- **Identity = chassis MAC (⛔ prerequisite).** The reporting device's own chassis MAC is
  **not** in RemTable, so the SNMP collection **must** add **`lldpLocChassisId`** (the
  local chassis-ID scalar). Its value is the entity identifier — identical to the
  `Networking` `mac` for the same device, so the two unify. **This is the hard blocker
  above: no local MAC ⇒ no MAC identity ⇒ no unification, and the LLDP source is unusable.**
- **Type = hybrid, from LLDP capabilities.** LLDP carries system capabilities
  (`lldpLocSysCapEnabled` / `lldpRemSysCapEnabled`). The collector normalizes these into a
  `deviceType` attribute **when it can classify**, mirroring the `Networking` vocabulary:
  - *WLAN AP* → `ap` → `NETWORK_AP`
  - *bridge* → `switch` → `NETWORK_SWITCH`
  - *router* → `gateway` → `NETWORK_GATEWAY`  *(assumption: routers reuse `GATEWAY`; a
    dedicated `NETWORK_ROUTER` type is an open item)*
  - *station-only* → **explicit `deviceType: host`** → **no `NETWORK_*` entity is
    synthesized** (the device is already an `INFRA-HOST`); it is linked as a *target* only
    (device→host, §7.5).
- **Hosts must use an explicit `host` value — not omission.** `deviceType: host` matches
  **none** of the synthesis rules (no host rule, and `present: false` fails because the
  attribute *is* present), so a host produces no `NETWORK_*` entity and never originates an
  edge. If a host's `deviceType` were instead *omitted*, the generic `present: false` rule
  below would wrongly turn it into a `NETWORK_DEVICE`. So ktranslate must distinguish
  **station-only → `host`** from **truly-unclassified → omitted**.
- **Fallback when `deviceType` is absent → generic `NETWORK_DEVICE` (via `present: false`).**
  If LLDP yields *no* classifiable type (and it is not a host), the collector **omits**
  `deviceType`, and a dedicated synthesis rule keyed on **`deviceType` `present: false`**
  creates a generic `NETWORK_DEVICE`. The entity schema supports this matcher ("Checks if
  the attribute is present (true) or absent (false)"), so the fallback lives **entirely in
  the entity definitions** — no ktranslate default value needed.
  - **No duplicates.** The `present: false` rule is mutually exclusive with the typed rules
    (which require `deviceType` *present* with a specific `value`). A switch has
    `deviceType` present → the fallback can't match it; an unclassified device has it
    absent → only the fallback matches. (A generic rule with *no* `deviceType` condition
    would instead match **every** device and duplicate each typed one — which is why the
    fallback must test `present: false`, not "anything".)
  - **⚠ Omit, don't blank.** "Absent" means the attribute is **not emitted**. A
    `deviceType: ""` (empty string) counts as *present* and matches neither the typed rules
    nor `present: false` → **no entity**. ktranslate must omit the field when unclassified.

### 7.4 Entity synthesis from LLDP

**How the GUID is computed (and why ktranslate does *not* compute it).** The LLDP entity
GUID is produced by ordinary entity synthesis — the **platform** builds it from the
matching rule, exactly like every other entity in this repo:

```
entity.guid = base64url_nopad( accountId | INFRA | <TYPE> | <identifier> )
            = base64url_nopad( "12345|INFRA|NETWORK_SWITCH|da:6b:ce:fe:1e:4e" )
```

- `<TYPE>` is decided by **which definition's rule matched**: `deviceType: switch` →
  the rule in `infra-network_switch` → `NETWORK_SWITCH`; `deviceType` **absent**
  (`present: false`) → `infra-network_device` → `NETWORK_DEVICE`; and so on.
- `<identifier>` is the **`lldpLocChassisId` value** (the device's own MAC), placed raw
  because `encodeIdentifierInGUID: false` (no hashing).

This is the crucial difference from the `Networking` source: there, the producer must
*also* carry a matching `entity.guid` because its **relationship** uses
`extractGuid: entity.guid` (§6.5). The **LLDP relationship does not use `entity.guid`** —
it resolves its source with `buildGuid` (or `lookupGuid`) and its target with `lookupGuid`
(§7.5). **ktranslate therefore does not compute or send `entity.guid`** — it only needs
the MAC present (as the `mac` tag, stamped on RemTable rows, plus the local `deviceType`
if `buildGuid` is used). The GUIDs still match the `Networking` source because both feed
the **same MAC string** into the same `accountId|INFRA|TYPE|…` shape.

| | `Networking` event | LLDP / SNMP (ktranslate) |
|---|---|---|
| Entity GUID computed by | platform (entity synthesis) | platform (entity synthesis) |
| Identifier in GUID | `mac` | `lldpLocChassisId` |
| Relationship **source** resolver | `extractGuid: entity.guid` | `buildGuid` if possible, else `lookupGuid` by `mac` |
| Relationship **target** resolver | `lookupGuid` by `dstMac` | `lookupGuid` by neighbor MAC |
| Carries `entity.guid` on telemetry? | **Yes** (event attr, §2) | **No** |

The three existing entity definitions each gain a **second synthesis rule** for the LLDP
metric (tags merge onto the same GUID when the identifier matches). A **new generic type**
`INFRA-NETWORK_DEVICE` is added for the fallback. Example rule added to
`entity-types/infra-network_switch/definition.yml`:

```yaml
    - identifier: lldpLocChassisId          # device's own chassis MAC
      name: device_name
      encodeIdentifierInGUID: false          # same raw-MAC encoding as the Networking rule
      conditions:
        - attribute: metricName
          value: kentik.snmp.lldpLocChassisId   # entity conditions use `value`, not `anyOf`
        - attribute: deviceType              # normalized at ingest from capabilities
          value: switch
        - attribute: lldpLocChassisId
          present: true
      tags:
        lldpLocChassisId:
          entityTagName: mac                 # expose as `mac` so the candidate can find it
        device_name: {}
        src_addr:
          entityTagName: ipAddress
        vendor: {}
        model: {}
```

The generic fallback `entity-types/infra-network_device/definition.yml`:

```yaml
domain: INFRA
type: NETWORK_DEVICE
synthesis:
  rules:
    - identifier: lldpLocChassisId
      name: device_name
      encodeIdentifierInGUID: false
      conditions:
        - attribute: metricName
          value: kentik.snmp.lldpLocChassisId
        - attribute: deviceType
          present: false                     # fallback: fires ONLY when deviceType is absent
        - attribute: lldpLocChassisId
          present: true
      tags:
        lldpLocChassisId: { entityTagName: mac }
        device_name: {}
        src_addr: { entityTagName: ipAddress }
ownership:
  primaryOwner:
    teamName: "Network Monitoring"
```

> **Cross-source MAC format must match.** The `lldpLocChassisId` string must be the same
> canonical MAC format as the `Networking` `mac` (and `lldpRemChassisId`), or the GUIDs
> won't line up and a device fragments into two entities. This is the hybrid model's
> accepted boundary risk (it fires only when formats disagree or a device is generic in
> one source and typed in the other).

### 7.5 Relationship synthesis from LLDP

Per the chosen approach, the LLDP **source is resolved with `buildGuid` when possible,
otherwise `lookupGuid`**; the **target is always `lookupGuid`** (its type isn't safely
knowable — see "Why the target can't be built" below). These rules live alongside the
`Networking` rule (same `NETWORK_DEVICE`-to-`NETWORK_DEVICE` file).

**Primary — source `buildGuid` (one rule per local type, incl. a generic fallback),
target `lookupGuid`.** Each RemTable row must carry the local chassis MAC; the local
`deviceType` selects the type (and is **absent** for the generic fallback). There are
four source rules: `switch`/`gateway`/`ap` (by `value`) and a generic rule keyed on
`deviceType present: false`. Switch shown first:

```yaml
  - name: lldpNetworkSwitchConnectsToNetworkDevice
    version: "1"
    origins:
      - Network Monitoring          # Kentik/ktranslate SNMP; confirm exact origin
    conditions:
      - attribute: metricName
        anyOf: ["kentik.snmp.lldpRemSysName", "kentik.snmp.lldpRemChassisId"]
      - attribute: deviceType            # the LOCAL device's normalized type (on the row)
        value: switch
      - attribute: lldpLocChassisId      # local chassis MAC (on the row)
        present: true
      - attribute: lldpRemChassisId
        present: true
    relationship:
      expires: PT75M
      relationshipType: CONNECTS_TO
      source:
        buildGuid:
          account: { attribute: accountId }
          domain:  { value: INFRA }
          type:    { value: NETWORK_SWITCH }                 # hard-coded per rule
          identifier:
            fragments: [ { attribute: lldpLocChassisId } ]   # raw MAC, no hash (matches encodeIdentifierInGUID: false)
      target:
        lookupGuid:
          candidateCategory: NETWORK_DEVICE
          fields:
            - field: mac
              attribute: lldpRemChassisId                    # neighbor MAC (primary)
            - field: hostname
              attribute: lldpRemSysName                      # neighbor name — matches INFRA-HOST fallback
```

The **generic fallback** rule is the same, but matches the *absence* of `deviceType` and
builds `NETWORK_DEVICE` — mirroring the entity fallback in §7.4 so the built GUID matches
the synthesized one:

```yaml
    conditions:
      - attribute: metricName
        anyOf: ["kentik.snmp.lldpRemSysName", "kentik.snmp.lldpRemChassisId"]
      - attribute: deviceType
        present: false                                       # generic: deviceType absent
      - attribute: lldpLocChassisId
        present: true
      - attribute: lldpRemChassisId
        present: true
    relationship:
      expires: PT75M
      relationshipType: CONNECTS_TO
      source:
        buildGuid:
          account: { attribute: accountId }
          domain:  { value: INFRA }
          type:    { value: NETWORK_DEVICE }                 # the generic fallback type
          identifier:
            fragments: [ { attribute: lldpLocChassisId } ]
      target:
        lookupGuid:
          candidateCategory: NETWORK_DEVICE
          fields:
            - field: mac
              attribute: lldpRemChassisId
            - field: hostname
              attribute: lldpRemSysName
```

**`buildGuid` (4 rules) + a `lookupGuid` source fallback.** With the local MAC on the row,
the source **builds deterministically** — typed when `deviceType` is a known value,
generic when it's absent. For robustness, each build rule has a **`lookupGuid`-by-`mac`
twin** carrying the *same* `deviceType` condition (resolving the source from the index
instead of building it); identical edges dedupe. Crucially, **every source rule (build and
its lookup twin) carries a `deviceType` match**, so a host row (`deviceType: host`) matches
**no** source rule — guaranteeing **device→host only**: hosts are only ever resolved
as *targets*.

Notes:
- **The local MAC on the row is required (⛔ blocker).** Every source rule —
  `buildGuid` (as the identifier) and any `lookupGuid` fallback (as the `mac` field) —
  needs `lldpLocChassisId` stamped on the RemTable row. Without it the source endpoint
  can't be resolved — see the §7 blocker.
- **`deviceType` on the row selects the source rule; its absence selects the generic.**
  A present `deviceType` value picks the typed build rule; **absent** `deviceType`
  (`present: false`) picks the generic `NETWORK_DEVICE` build rule; the `lookupGuid` twins
  mirror the same conditions. `deviceType: host` matches none (device→host only). So every
  non-host case is covered as long as `deviceType` is *a known value, `host`, or omitted*
  (never blank).
- **`buildGuid` source must reproduce the entity GUID exactly.** Same `accountId`,
  `INFRA`, the matching `NETWORK_*` type, and the **raw** `lldpLocChassisId` (no hash,
  matching `encodeIdentifierInGUID: false`). A mismatch (wrong type, different MAC format)
  yields a dangling source — the same coupling caveat as §6.5. This is why the type must
  be hard-coded per rule (so it certainly matches what synthesis assigned).
- **Why the target can't be built.** `buildGuid` needs a concrete `type`. RemTable
  advertises the neighbor's capabilities (`lldpRemSysCapEnabled`), so a type could be
  *guessed* — but it must exactly equal the type the neighbor's **own** entity was
  synthesized with, which may come from the `Networking` source or have fallen back to
  generic `NETWORK_DEVICE`. Any disagreement builds a GUID pointing at a **non-existent
  entity → dangling edge**. `lookupGuid` by MAC finds the real entity *whatever its type*.
  This is the §6.1 problem, amplified because two sources can type the same MAC
  differently — so the target stays a lookup.
- **Host leaves are linked to `INFRA-HOST` (device→host only).** The candidate (§6.2)
  includes `INFRA-HOST`, so when a network device reports a host neighbor, the **target**
  lookup resolves to the existing host entity — by `mac` (`lldpRemChassisId`) first, then
  by `hostname` (`lldpRemSysName`). This requires `INFRA-HOST` to expose a matching `mac`
  tag and/or a name tag (open item). Hosts never originate edges (they carry
  `deviceType: host`, which matches no source rule), so we only get switch→server links,
  not server→switch.
- **`mac` is the only key for the network types; `hostname` exists mainly for hosts.**
  The `ipAddress` predicate was removed (the local MAC is mandatory per the §7 blocker, so
  an IP fallback was contradictory and risked false matches). The candidate now keys on
  `mac` (primary) and `hostname` (fallback, chiefly to match `INFRA-HOST` by name).

### 7.6 Ingest requirements introduced by LLDP

The SNMP/`ktranslate` side must:
1. Collect **`lldpLocChassisId`** (each device's own chassis MAC) — the unified identity.
2. Normalize LLDP **capabilities → a `deviceType`** attribute, using a **three-way**
   distinction (this is essential — see §7.3):
   - classifiable network device → `ap` / `switch` / `gateway`;
   - station-only host → the **explicit value `host`** (so it gets no `NETWORK_*` entity
     and never originates an edge — it's linked as an `INFRA-HOST` target instead);
   - genuinely unclassified → **omit `deviceType`** (never send `""`) → generic
     `NETWORK_DEVICE` via the `present: false` rules.
3. Emit MACs in the **same canonical format** as the `Networking` source.
4. **Stamp the local chassis MAC (`lldpLocChassisId`) onto every RemTable data point** —
   required for the source endpoint (⛔ blocker).
5. **Carry the same local `deviceType` signal on RemTable rows** (known value, `host`, or
   omitted) so the source rules fire correctly.
6. Ensure each RemTable data point co-locates everything a relationship rule reads —
   `lldpLocChassisId`, `lldpRemChassisId`, `lldpRemSysName`, `deviceType`, `accountId` —
   on the **same** point (synthesis evaluates one data point at a time).
7. (Optional) carry `vendor`/`model` (from `sysDescr`) for golden tags.

## 8. Why Option C (per type AND vendor) was rejected

Option C would create vendor-specific, per-type entities such as
`JUNIPER_MIST_SWITCH`, `CISCO_AP`, etc. (the pattern the existing `INFRA-JUNIPER_MIST_*`
entities follow). It was considered and rejected.

**Pros of C**
- Maximum specificity — vendor-branded entity types, icons, and experiences.
- Matches what is already shipped for Juniper Mist, so it would be consistent with
  prior art in this repo.
- Per-vendor, per-type golden metrics and dashboards are possible.

**Cons of C (why we rejected it)**
- **Worst case for relationships.** The target end of a connection gives us only
  `dstMac` — neither the destination's vendor nor its type. To resolve it we would need
  a candidate lookup spanning the full **`vendor × type`** matrix of entity types,
  matched only by MAC. Every new vendor enlarges that matrix.
- **Entity-type explosion.** Each supported vendor multiplies the number of entity
  types (and potentially relationship/candidate config) by the number of device types.
- **Cross-vendor links are awkward.** Real topologies routinely connect, e.g., a Juniper
  switch to a Cisco AP. With per-vendor types these links are common yet span unrelated
  type families, complicating both modeling and queries.
- **No benefit to identity.** Since identity is `mac` only, vendor is already captured
  as a tag; encoding it in the type adds cost without improving uniqueness.

**Why B is the chosen middle ground.** Option B keeps per-type entities (so per-type
golden metrics/dashboards remain possible) while keeping `vendor` as a tag. The target
candidate then only has to span **three** types instead of a vendor matrix, and
cross-vendor links are natural because all devices share the same three type families.

> Note: a single generic `NETWORK_DEVICE` type (Option A) would have made relationships
> fully deterministic via `buildGuid` on both ends (no candidate needed), at the cost of
> per-type golden metrics. B was chosen to preserve per-type modeling; the candidate +
> `lookupGuid` mechanism is the price paid for that choice.

## 9. Known limitations & out of scope

- **Ports are not first-class.** `port` / `dstPort` describe the *connection*, not the
  device. Relationship synthesis cannot attach metadata to an edge, so port information
  is not represented on the topology link. (A lossy "last seen port" tag on the device
  is possible but is intentionally out of scope.)
- **Unknown destinations produce no edge.** With `onMiss: NO_OP`, a `dstMac` that is not
  a monitored device yields no relationship until/unless that device reports its own
  events. Switching to `CREATE_UNINSTRUMENTED` later would surface such neighbors.
- **MAC format consistency is required.** The entity GUID is built from the raw `mac`
  attribute; the producing integration must emit MACs in a single canonical format —
  and must use that *same* string when computing `entity.guid` (Section 6.5).
- **Producer ↔ definition coupling.** The source path relies on the producer computing
  `entity.guid` to exactly match the synthesized GUID (Section 6.5). Any change to
  identity, domain, type mapping, or identifier encoding must be rolled out to the
  producer in lockstep, or source links silently break. This is the main risk of the
  chosen approach; `buildGuid`/`lookupGuid` source fallbacks remove it.
- **No container hierarchy.** `networkId` / `vendorOrgId` are stored as tags only; no
  `NETWORK`/`SITE` container entity or `CONTAINS` relationships are synthesized.
- **Relationship timing.** A `CONNECTS_TO` edge appears only once the **target** device
  has been synthesized (so it exists as a candidate). For monitored-to-monitored links
  this resolves quickly as both devices report. The source half has no such dependency
  (its GUID is on the event).
- **Cross-source boundary duplicates (hybrid).** A device seen by *both* sources unifies
  only if they agree on the GUID — i.e. same MAC format *and* same type. If LLDP falls
  back to generic `NETWORK_DEVICE` for a device the `Networking` source typed as
  `NETWORK_SWITCH`, the two GUIDs differ and the device appears twice. Capability-based
  typing (§7.3) keeps this rare; it is the accepted cost of the hybrid choice.
- **Host edges are device→host only.** Switch→server links are created by resolving the
  host neighbor to an existing `INFRA-HOST` (§7.5). Server→switch edges (from a host's own
  LLDP) are **not** created. Also depends on `INFRA-HOST` exposing a matching `mac` and/or
  name tag (open item) — if it exposes neither, host links won't form.

## 10. Files to create

| Path                                                                          | Purpose                                      |
|-------------------------------------------------------------------------------|----------------------------------------------|
| `entity-types/infra-network_ap/definition.yml`                                | `NETWORK_AP` synthesis (Networking rule + LLDP rule) |
| `entity-types/infra-network_switch/definition.yml`                            | `NETWORK_SWITCH` synthesis (Networking rule + LLDP rule) |
| `entity-types/infra-network_gateway/definition.yml`                           | `NETWORK_GATEWAY` synthesis (Networking rule + LLDP rule) |
| `entity-types/infra-network_device/definition.yml`                            | **Generic `NETWORK_DEVICE`** fallback type (LLDP-only unclassified, §7.4) |
| `relationships/candidates/NETWORK_DEVICE.yml`                                 | MAC → device candidate across the 4 `NETWORK_*` types **+ `INFRA-HOST`**; keys `mac` (primary) + `hostname` (fallback) |
| `relationships/synthesis/INFRA-NETWORK_DEVICE-to-INFRA-NETWORK_DEVICE.yml`    | `CONNECTS_TO` rules: 1 `Networking` (`extractGuid`) + LLDP source rules (4 `buildGuid` by `deviceType`/`present:false` + a `lookupGuid`-by-`mac` twin each), all with a `lookupGuid` target |

Each new entity type also needs the repo-standard companion files (e.g. a golden
metrics file and any required `definition` defaults) per the validator's expectations;
the implementation plan will enumerate these. The three typed definitions carry **two
synthesis rules each** (one per source); `infra-network_device` is wholly new and holds
the LLDP **generic fallback** rule (`deviceType present: false`). The relationship file
holds the `Networking` rule plus the LLDP rules (four `buildGuid` source variants +
their `lookupGuid` twins). `INFRA-HOST` is **not** created here — it is only referenced by
the candidate for device→host links.

## 11. Open items to confirm during implementation

- Exact `mac` format emitted by the integration (for the consistency requirement, and
  because `entity.guid` embeds it verbatim).
- **`entity.guid` correctness**: the event carries `entity.guid` (§2); confirm it is
  computed exactly per §6.5 (`deviceType → NETWORK_*` mapping, base64url no-pad, raw
  `mac`). Add a canary that verifies the event's `entity.guid` matches the synthesized
  GUID, since a drift silently breaks every source-side relationship.
- Whether `Event API` is the sole origin, or additional origins should be listed.
- Golden metrics per device type (names/queries) — needed for the entity definitions to
  pass validation and to be useful in the UI.

**LLDP/SNMP source (§7):**
- **⛔ BLOCKER — local source MAC in the telemetry.** `ktranslate` **must** (a) collect
  **`lldpLocChassisId`** (each device's own chassis MAC) and (b) **stamp that local chassis
  MAC onto every RemTable data point**, in the **same MAC format** as the `Networking`
  source. Without both, LLDP devices have no MAC identity and LLDP relationships have no
  source endpoint — **the LLDP integration does not work at all** (§7 blocker). This must
  be confirmed feasible *before* implementing §7; there is no workaround in the entity
  definitions.
- Confirm `ktranslate` can emit a normalized **`deviceType`** (from LLDP capabilities)
  **when classifiable and omit it otherwise** (never `""`), on both the
  `lldpLocChassisId` metric and RemTable rows. Absent `deviceType` is the trigger for the
  generic `NETWORK_DEVICE` (`present: false`); a blank string would break it.
- Confirm the **origin** string for Kentik/SNMP metrics (`Network Monitoring` vs others).
- Decide **router → `NETWORK_GATEWAY`** (current assumption) vs a dedicated
  `NETWORK_ROUTER` type.
- Confirm exact `metricName`s and attribute names (`lldpRemChassisId`, `lldpRemSysName`,
  `src_addr`, `device_name`) as emitted by `ktranslate`.
- **Attribute co-location (⛔-adjacent):** verify `ktranslate` can place
  `lldpLocChassisId` + `lldpRemChassisId` + `lldpRemSysName` + `deviceType` + `accountId`
  on the **same** RemTable data point (relationship synthesis reads one point at a time).
- **`INFRA-HOST` matchability:** confirm `INFRA-HOST` exposes a `mac` tag equal to
  the LLDP chassis MAC, and/or a name tag matching `lldpRemSysName`. If neither, device→host
  links can't form — settle the exact tag keys for the candidate's `mac`/`hostname`
  predicates (also applies to the `NETWORK_*` name tag).
- **`deviceType` three-way contract:** ktranslate must emit `host` for station-only
  devices and **omit** `deviceType` only for truly-unclassified ones (never `""`).
