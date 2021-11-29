# Entity Summary

The entity summary is the main page of an entity.
Is where users can see all information about a specific entity.


Dashboards should be listed in the `definition.yml` file under `dashboardTemplates` section.

If the entity type only has one source of data use `newRelic` as the default source.

```yaml
dashboardTemplates:
  newRelic:
    template: dashboard.json
```

In order to get a dashboard in JSON format [create a dashboard](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/) in New Relic and [export it as json](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/dashboards-charts-import-export-data/#dashboards)

![Export Dashboard](./images/export_dashboard.png)

Copy the JSON content into the `dashboard.json` file.

Make sure your dashboard is valid running our sanitizer 

	docker-compose run sanitize-dashboards

You can also run it with npm

	cd validator && npm i && npm run sanitize-dashboards

## Multiple sources of data

In some cases your entity will receive different metrics from different sources.
We allow to provide a different summary page representation for each one of them.

In this example `prometheus` and `newRelic` are the values the entity must have in the `instrumentation.provider` tag.
The first tag value that matches with the entity will be the one used to serve the summary page.

```yaml
dashboardTemplates:
  newRelic:
    template: newRelic_dashboard.json
  prometheus:
    template: prometheus_dashboard.json
```

We recommend prefixing the dashboards names with the source name. 

There's also the possibility to specify both provider and name in the form of `{provider}/{name}`.
1.  You must add the provider as a value of the `instrumentation.provider` tag. (e.g. provider: `kentik`, as in the example)
2.  You must add the name of the provider in the `instrumentation.name` tag. (e.g. provider name: `netflow-events`, as in the example)

Is also important to note that the semantics of the queries should match between each implementation. This includes things like average vs counts, units and other details.

If no rule matches, the first one on the list will be used. In the example above that would be `prometheus`.

```yaml
dashboardTemplates:
  kentik/netflow-events:
    template: kentik_netflow-evens_dashboard.json
```
