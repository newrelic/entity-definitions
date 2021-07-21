# Summary Metrics

Summary metrics are data related to entities that describes how certain parameters are behaving based the on the available telemetry. 

We recommend to add a maximum of 10 metrics per entityType.

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
 
A summary metric can be either an **NRDB-query-based metric**, a **Tag metric** (summary tag), or a **Derived metric**, depending on the source of the information. 

For this reason, exactly one of the `query`, `tag` and `derive` configuration needs to be
provided. If less or more than one of them is found, the metric definition will not be valid.

| **Name** | **Type**                      | **Description**                                            |
| -------- | ----------------------------- | ---------------------------------------------------------- |
| title    | String                        | The human-readable name of the metric                      |
| unit     | [Metric Unit](#metric-unit)    | The unit of the metric                                     |
| hidden     | Boolean   | If the metric is hidden it will not appear on any UI visualizations, but it can only be used to define intermediate metrics referenced by others. Defaults to false.  |
| query    | [NRDB Query](#nrdb-query)     | The configuration for an NRDB-query-based metric                 |
| tag      | [Tag](#tag)                    | The configuration for a tag metric        |
| derive   | [Derive String](#derive-string) | The string to define a derived metric                      |


### Metric Unit

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


### NRDB Query

The `query` map contains the information that is used to define a NRDB-query-based metric:

| **Name**      | **Type**                       | **Description**                                                                                  |
| ------------- |------------------------------- | ------------------------------------------------------------------------------------------------ |
| from          | String                         | A NRDB event, e.g. `SystemSample`, or `Metric`                                                  |
| select        | String                         | What has to be selected from the given NRDB event, e.g `count(*)`                                |
| where         | String                         | An *optional* NRQL filter, e.g. `foo = 'bar'`                                                    |
| eventId       | String                         | The event attribute you want to facet and filter for, e.g. `entity.guid`                           |

### Tag

| **Name** | **Type** | **Description**                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------- |
| key      | String   | The tag key you want to fetch the corresponding value for, e.g. `providerAccountName` |

### Derive string 

The derive string can be used to derive a summary metric out of others.
It is possible to reference other metrics using `@metricName`. Metrics can be added, subtracted, multiplied and divided by other metrics or numbers.

Example: 

    (@metricA * 100) / (@metricB + @metricC)

If a derive metric references a metric that does not exist, it will result in an error.
If a derive metric references a metric whose value is `null`, its value will be `null` too. E.g. 

    @metricA + @metricB + 100

If either `metricA` or `metricB` is null, the value of the derived metric will be `null` too.

Aside from normal mathematical operations, the `||` (or) operator can be used, which
returns the value of the first metric that has a value different than `null`. e.g. 

    @metricA || 10

It returns the value of `metricA` if it's not `null`, `10` otherwise.


### Roll-up entities

In the cases that the entity type can be ingested from different sources and you need to provide a different query implementation you can use `queries` instead of `query`

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

In this example `prometheus` and `newRelic` are the values the entity must have in the `instrumentation.provider` tag.
The first tag value that matches with the entity will be the one used to build the queries.

Is also important to note that the semantics of the queries should match between each implementation. This includes things like average vs counts, units and other details.

If no rule matches, the first one on the list will be used. In the example above that would be `prometheus`.
