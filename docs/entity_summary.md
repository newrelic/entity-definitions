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

![Export Dashboard](./docs/images/export_dashboard.png)

Copy the JSON content into the `dashboard.json` file.

Make sure your dashboard is valid running our sanitizer 

	docker-compose run sanitize-dashboards

You can also run it with npm

	cd validator && npm i && npm run sanitize-dashboards
