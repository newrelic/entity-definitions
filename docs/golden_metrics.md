# Golden Metrics

Queries for metrics deemed the most important for a specific entity type. 

We allow a maximum of 10 metrics per entityType.

## Defining golden metrics

Golden metrics are defined in a map where each key is a camel-case name that defines the intention of the metric: 

```yaml
memoryUsage:
  title: "A title explaining what the user is seeing (unit displayed in the dashboard)"
  query:
    select: average(host.memoryUsagePercent)
    from: Metric
    where: ""
    facet: entity.name
    eventId: entity.guid
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


### Query options

| **Name** | **Mandatory** | **Default** | **Description**                                            | 
| -------- | ------------- | ------------ | ---------------------------------------------             |
| select    |      Yes      |  | Provide the field and function you want to display in the metric. You must only provide one field, but you can do aggregations, sums, etc. Always name the fields to make it easier to read. e.g. `sum((provider.httpCodeElb4XXCount.Sum OR 0) + (provider.httpCodeElb5XXCount.Sum OR 0)) AS 'Errors'`|
| from |   No    | `Metric` | Choose where your metric gathers the information from |
| where |   No    | empty string | In the case you need a more granular WHERE clause added into the query you can use this field. e.g. `provider='Alb'` |
| facet |   No    | `entity.name` | Which field to use when doing a FACET. This field will be used when displaying the metric for several entities |
| eventId |   No    | `entity.guid` | This defines which field is used in the WHERE clause. We recommend to use the default. |

