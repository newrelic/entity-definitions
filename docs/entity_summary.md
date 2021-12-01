# Entity Summary

The entity summary is the entity's main page, and contains all the information about a specific entity:

* Dashboards should be listed in the `definition.yml` file, under the `dashboardTemplates` section.
* If the entity type only has one source of data, use `newRelic` as the default source.

```yaml
dashboardTemplates:
  newRelic:
    template: dashboard.json
```

In order to get a dashboard in JSON format, [create a dashboard](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/) in New Relic and [export it as json](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/dashboards-charts-import-export-data/#dashboards).

![Export Dashboard](./images/export_dashboard.png)

Copy the JSON content to the `dashboard.json` file.

Make sure your dashboard is valid running our sanitizer: 

`docker-compose run sanitize-dashboards`

You can also run it with npm:

`cd validator && npm i && npm run sanitize-dashboards`

## Multiple sources of data

In some cases your entity will receive metrics from different sources. We provide a different summary page representation for each one of them.

In this example, the entity must have `prometheus` and `newRelic` in the `instrumentation.provider` tag. The first tag value that matches the entity will serve the summary page:

```yaml
dashboardTemplates:
  newRelic:
    template: newRelic_dashboard.json
  prometheus:
    template: prometheus_dashboard.json
```

We recommend prefixing dashboard names with the source name. 

You can also specify both provider and name in the form of `{provider}/{name}`.

1.  Add the provider as a value of the `instrumentation.provider` tag. For example, provider: `kentik`.
2.  Add the name of the provider in the `instrumentation.name` tag. For example, provider name: `netflow-events`.

Note that query semantics (such as average vs counts, units, etc.) should match in each implementation. If no rule matches, the first one on the list will be used. In the example above, `prometheus` would be used.

```yaml
dashboardTemplates:
  kentik/netflow-events:
    template: kentik_netflow-evens_dashboard.json
```
