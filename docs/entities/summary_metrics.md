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
```
 
A summary metric can be either a **tag metric** (summary tag), or a **golden metric reference**, depending on the source of the information. Therefore, you need to configure exactly ONE out of `tag` or `goldenMetric`.

| **Name** | **Type**                      | **Description**                                            |
| -------- | ----------------------------- | ---------------------------------------------------------- |
| title    | String                        | The human-readable name of the metric.                     |
| unit     | [Metric Unit](#metric-unit)    | The unit of the metric.                                   |
| tag      | [Tag](#tag)                    | The configuration for a tag metric.        |
| goldenMetric | [Golden Metric Reference](#golden-metric-reference) | A reference to an existing [golden metric](golden_metrics.md). |

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

### Tag

| **Name** | **Type** | **Description**                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------- |
| key      | String   | The tag key you want to fetch the corresponding value for, for example `providerAccountName`. |

### Golden metric reference

Summary metrics definitions are the same as, or a subset of [golden metrics](golden_metrics.md) definitions. Because of that, a summary metric definition can reuse a golden metric definition by having a reference to it. For consistency, the key defining a summary metric and the key defining a golden metric should be the same. In the following example, the `memoryUsage` summary metric definition points to the `memoryUsage` golden metric definition:
```yaml
memoryUsage:
  goldenMetric: memoryUsage
  unit: BYTES
```
