# Summary Metrics

Summary metrics are data related to entities which describe how certain parameters behave, based on the available telemetry. 

We recommend adding 3 metrics, and never more than 10. We also recommend defining them as a reference to a golden metric.

## Defining summary metrics

Summary metrics are defined in a map where each key is a camel-case name that defines the intention of the metric: 

```yaml
memoryUsage:
  goldenMetric: memoryUsage
  title: "A title explaining what the user is seeing"
  unit: PERCENTAGE
  query:
    select: average(host.memoryUsagePercent)
    from: Metric
    where: "tags.environment = 'production'"
    eventId: entity.guid
```
 
A summary metric can be either an **NRDB-query-based metric**, a **tag metric** (summary tag), or a **golden metric reference**, depending on the source of the information. Therefore, you need to configure exactly ONE out of `query` or `tag`. If an amount different to one is detected, the metric definition will not be valid. `query` can coexist with `goldenMetric` for the time being, but the former is being deprecated in favor of the latter.

| **Name** | **Type**                      | **Description**                                            |
| -------- | ----------------------------- | ---------------------------------------------------------- |
| title    | String                        | The human-readable name of the metric.                     |
| unit     | [Metric Unit](#metric-unit)    | The unit of the metric.                                   |
| query    | [NRDB Query](#nrdb-query)     | The configuration for an NRDB-query-based metric (deprecated: use `goldenMetric` instead). |
| tag      | [Tag](#tag)                    | The configuration for a tag metric.        |
| goldenMetric | [Golden Metric Reference](#golden-metric-reference) | A reference to the [golden metric](golden_metrics.md) this summary metric should be based on. |

### Metric unit

The unit of the metric must be a string with one of the following values:

- REQUESTS_PER_SECOND
- REQUESTS_PER_MINUTE
- PAGES_PER_SECOND
- MESSAGES_PER_SECOND
- OPERATIONS_PER_SECOND
- COUNT
- SECONDS
- MS
- PERCENTAGE
- BITS
- BYTES
- BITS_PER_SECOND
- BYTES_PER_SECOND
- HERTZ
- APDEX
- TIMESTAMP
- STRING (Not supported for NRDB queries, please use tags instead)
- CELSIUS

### NRDB query

The `query` map contains the information used to define a NRDB-query-based metric:

| **Name**      | **Type**                       | **Description**                                                                                  |
| ------------- |------------------------------- | ------------------------------------------------------------------------------------------------ |
| from          | String                         | An NRDB event, for example `SystemSample`, or `Metric`.                                                  |
| select        | String                         | What has to be selected from the given NRDB event, for example `count(*)`.                                |
| where         | String                         | An *optional* NRQL filter, for example `foo = 'bar'`.                                                  |
| eventId       | String                         | The event attribute you want to facet and filter for, for example `entity.guid`.                           |

**Note**: `query` is deprecated: use `goldenMetric` instead.

### Tag

| **Name** | **Type** | **Description**                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------- |
| key      | String   | The tag key you want to fetch the corresponding value for, for example `providerAccountName`. |

### Golden metric reference

In most cases, summary metrics definitions are the same as, or a subset of [golden metrics](golden_metrics.md) definitions. Because of that, a summary metric definition can reuse a golden metric definition by having a reference to it. For consistency, the key defining a summary metric and the key defining a golden metric should be the same. In the following example, the `memoryUsage` summary metric definition points to the `memoryUsage` golden metric definition:
```yaml
memoryUsage:
  goldenMetric: memoryUsage

```

### Roll-up entities

When the entity type can be ingested from multiple sources, you'll be required to provide a different query implementation for each source. In this case, you should use `queries` instead of `query`:

```yaml
memoryUsage:
  goldenMetric: memoryUsage
  title: "A title explaining what the user is seeing (unit displayed in the dashboard)"
  unit: COUNT
  queries:
    prometheus:
      select: sum(field)
      from: PrometheusSample
    newRelic:
      select: sum(nrField)
      from: NewRelicSample
```

In this example, the entity must have `prometheus` and `newRelic` in the `instrumentation.provider` tag. The first tag value that matches the entity will be used to build the queries.

```yaml
destinations:
  goldenMetric: destinations
  title: Unique Destinations
  queries:
    kentik/netflow-events:
      select: uniqueCount(dst_addr)
      from: KFlow
      where: "provider = 'kentik-flow-device'"
```

There's also the possibility to specify both provider and name in the form of `{provider}/{name}`.

1.  Add the provider as a value of the `instrumentation.provider` tag. For example, provider: `kentik`.
2.  Add the name of the provider in the `instrumentation.name` tag. For example, provider name: `netflow-events`.

Note that query semantics (such as average vs counts, units, etc.) should match in each implementation. If no rule matches, the first one on the list will be used. In the example above, `prometheus` would be used.
