# Summary Metrics

Summary metrics are data related to entities which describe how certain parameters behave, based on the available telemetry. 

We recommend adding 3 metrics, and never more of 10. We also recommend defining them like the golden metrics.

## Defining summary metrics

Summary metrics are defined in a map where each key is a camel-case name that defines the intention of the metric: 

```yaml
memoryUsage:
  title: "A title explaining what the user is seeing"
  unit: PERCENTAGE
  query:
    select: average(host.memoryUsagePercent)
    from: Metric
    where: "tags.environment = 'production'"
    eventId: entity.guid
```
 
A summary metric can be either an **NRDB-query-based metric**, a **tag metric** (summary tag), or a **derived metric**, depending on the source of the information. Therefore, you need to configure exactly ONE out of `query`, `tag` or `derive`. If an amount different to one is detected, the metric definition will not be valid.

| **Name** | **Type**                      | **Description**                                            |
| -------- | ----------------------------- | ---------------------------------------------------------- |
| title    | String                        | The human-readable name of the metric.                      |
| unit     | [Metric Unit](#metric-unit)    | The unit of the metric .                                    |
| hidden     | Boolean   | If the metric is hidden, it will not appear on any UI visualizations. It can only be used to define intermediate metrics referenced by others. Defaults to false.  |
| query    | [NRDB Query](#nrdb-query)     | The configuration for an NRDB-query-based metric.                 |
| tag      | [Tag](#tag)                    | The configuration for a tag metric.        |
| derive   | [Derive String](#derive-string) | The string to define a derived metric.                      |

### Metric unit

The unit of the metric must be a string with one of the following values:

- REQUESTS_PER_SECOND
- PAGES_PER_SECOND
- MESSAGES_PER_SECOND
- OPERATIONS_PER_SECOND
- COUNT
- SECONDS
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

### Tag

| **Name** | **Type** | **Description**                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------- |
| key      | String   | The tag key you want to fetch the corresponding value for, for example `providerAccountName`. |

### Derive string 

The `derive` string can be used to derive a summary metric out of others. It's possible to reference other metrics using `@metricName`. Metrics can be added, subtracted, multiplied, and divided by other metrics or numbers.

Example: 

    (@metricA * 100) / (@metricB + @metricC)

* If a derived metric references a metric that doesn't exist, it will result in an error.
* If a derived metric references a metric whose value is `null`, its value will be `null` too: 

    @metricA + @metricB + 100

If either `metricA` or `metricB` is null, the value of the derived metric will be `null` too.

Aside from normal mathematical operations, the `||` (or) operator can be used, which returns the value of the first metric that has a value different from `null`:  

    @metricA || 10

It returns the value of `metricA` if it's not `null`, `10` otherwise.

### Roll-up entities

When the entity type can be ingested from multiple sources, you'll be required to provide a different query implementation for each source. In this case, you should use `queries` instead of `query`:

```yaml
memoryUsage:
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
