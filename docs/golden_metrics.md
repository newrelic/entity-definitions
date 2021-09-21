# Golden Metrics

Queries for metrics deemed the most important for a specific entity type. 

We allow a maximum of 10 metrics per entityType.

## Defining golden metrics

Golden metrics are defined in a map where each key should be unique. The allowed characters are `[a-zA-Z0-9_]` with a maximum of 100 characters.
This key defines the intention of the metric:

```yaml
memoryUsage:
  title: "A title explaining what the user is seeing (unit displayed in the dashboard)"
  unit: COUNT
  query:
    select: average(host.memoryUsagePercent)
    from: Metric
    where: ""
    facet: ""
    eventId: entity.guid
    eventName: entity.name
  displayAsValue: false
```

All the fields, except `title` and `query.select`, are optional.

The previous example shows the default values for each configuration option, so it's equivalent to this:

```yaml
memoryUsage:
  title: "A title explaining what the user is seeing (unit displayed in the dashboard)"
  query:
    select: average(host.memoryUsagePercent)
```

### Metric options

| **Name** | **Mandatory** | **Default** | **Description**                                            | 
| -------- | ------------- | ------------ | ---------------------------------------------             |
| title    |      Yes      |  | Provide a meaningful title to the graph or value you are displaying. Is also a good practice to add the unit at the end. e.g. `Effective memory available to VMs (MB)`|
| displayAsValue |   No    | `false` | Use this option if you want to display a value instead of a line (TIMESERIES) when viewing the information of *one* entity. |
| unit     | [Metric Unit](#metric-unit)    | The unit of the metric                                     |


### Query options

| **Name** | **Mandatory** | **Default** | **Description**                                            | 
| -------- | ------------- | ------------ | ---------------------------------------------             |
| select    |      Yes      |  | Provide the field and function you want to display in the metric. You must only provide one field, but you can do aggregations, sums, etc. Always name the fields to make it easier to read. e.g. `sum((provider.httpCodeElb4XXCount.Sum OR 0) + (provider.httpCodeElb5XXCount.Sum OR 0)) AS 'Errors'`|
| from |   No    | `Metric` | Choose where your metric gathers the information from |
| where |   No    | empty string | In the case you need a more granular WHERE clause added into the query you can use this field. e.g. `provider='Alb'` |
| facet |   No    | empty string | An extra facet by a specific field to be added to the default facet by entityName |
| eventId |   No    | `entity.guid` | The event attribute used to filter the entity. We recommend to use the default `entity.guid` which is generated automatically as part of the entity synthesis. |
| eventName |   No    | `entity.name` | The name of the field in the event that references the entity name. By default `entity.guid` which is generated automatically as part of the entity synthesis. |

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
- CELSIUS

### Roll-up entities

In the cases where the entity type can be ingested from multiple sources, you'll be required to provide a different query implementation per source. In this case, you should use `queries` instead of `query`

```yaml
memoryUsage:
  title: "A title explaining what the user is seeing (unit displayed in the dashboard)"
  queries:
    prometheus:
      select: average(field)
      from: PrometheusSample
    newRelic:
      select: average(nrField)
      from: NewRelicSample
```

In this example `prometheus` and `newRelic` are the values the entity must have in the `instrumentation.provider` tag.
The first tag value that matches with the entity will be the one used to build the queries.

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
1.  You must add the provider as a value of the `instrumentation.provider` tag. (eg provider: `kentik`, as in the example)
2.  You must add the name of the provider in the `instrumentation.name` tag. (eg provider name: `netflow-events`, as in the example)

Is also important to note that the semantics of the queries should match between each implementation. This includes things like average vs counts, units and other details.

If no rule matches, the first one on the list will be used. In the example above that would be `prometheus`.
