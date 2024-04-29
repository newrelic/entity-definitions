[![Community Plus header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Community_Plus.png)](https://opensource.newrelic.com/oss-category/#community-plus)

# Entity Definitions

This repository holds all the entity types that exist in New Relic and their configurations.

By proposing changes to this repository you can achieve the following:
- Create a new entity type
- Generate entities from a new source of data (telemetry, logs, etc)
- Change how an entity is represented in different experiences via golden metrics ( [New Relic Lookout](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-lookout-monitor-your-estate-glance/), [workloads](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/workloads/workloads-isolate-resolve-incidents-faster/), etc) and summary metrics ([entity explorer](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-explorer-view-performance-across-apps-services-hosts/))
- Modify the summary of an entity type
- Modify the lifecycle of an entity and make them `alertable` (see [Lifecycle](docs/entities/lifecycle.md) for more information about this attribute)

## Changelog

All notable changes are defined in the [releases page](https://github.com/newrelic/entity-definitions/releases).

## Getting started

For newcomers, we recommend checking the [creating an entity type example](docs/entities/README.md).
This document will walk through creating an entity type from scratch.

If you have experience with the repo and are looking for a specific section documentation:

- [GUID Spec](docs/entities/guid_spec.md)
- [Synthesis](docs/entities/synthesis.md)
- [Lifecycle](docs/entities/lifecycle.md)
- [Entity Summary](docs/entities/entity_summary.md)
- [Golden Metrics](docs/entities/golden_metrics.md)
- [Golden Tags](docs/entities/golden_tags.md)
- [Summary Metrics](docs/entities/summary_metrics.md)

If you're interested in exploring **experimental features**, you can find them here:

- [Relationship Synthesis](docs/relationships/relationship_synthesis.md)

## Validation

Whenever there's a contribution via pull request, some validations are automatically executed to verify that the provided definition meets the basic requirements:

* The definition files are not malformed, incorrect or missing mandatory fields.
* The *identifier* cannot be extracted from an attribute with the same name for two different Domain-Types, unless conditions are set to differentiate them, so that the conditions from one entity are not a superset of the other.

You can execute the validations locally using our dockerized validator:

```
docker-compose run validate-definitions
```

Remember that you may need to rebuild the images to pick up validation changes if you have run this in the past.

```
docker-compose build validate-definitions
```

Read more about the [current validations](/validator/README.md).

## Testing

You can test that the synthesis rules from your entity definition match the expected telemetry, thus generating the expected entities. In order to do this, we offer the possibility of adding test data that would simulate telemetry events. Whenever there's a contribution via pull request, the test data is checked against the synthesis rules, ensuring your changes match.

### How to add testing data

1. If it does not exist, create a folder named `tests` under your entity definition directory. If it already exists, skip this step.

  i.e. `definitions/ext-pihole/tests/`

2. Build one or more test files that represent the telemetry data that would synthesize entities of your domain and type. Each file must comply:
* The file name is the event name reported to New Relic. i.e. `Log`, `CustomEvent`
* The file name has `.json` extension. i.e. `Log.json`, `CustomEvent.json`
* The file content is a valid json that consists of an array of objects, where every object represents a telemetry data point

  **Log.json**
```
[
	{
		"attribute1": "value1"
	},
	{
		"attribute1": "value1",
		"attribute2": "value2",
		"attribute3": "value3"
	}
]
```

3. Create your pull request normally and the test would be executed in the background. If the synthesis rules from the definition don't match the test data, a bot will let you know with an explanatory comment in the pull request.

See [ext-pihole definition](https://github.com/newrelic/entity-definitions/tree/main/entity-types/ext-pihole/tests/) for an example of test data.


## Support

Is the information provided in the repository not enough to solve your doubts? Get in touch with the team by opening an issue!

**Other Support Channels**

* [New Relic Documentation](https://docs.newrelic.com): Comprehensive guidance for using our platform
* [New Relic Community](https://discuss.newrelic.com): The best place to engage in troubleshooting questions
* [New Relic Developer](https://developer.newrelic.com/): Resources for building a custom observability applications
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level
* [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contributing
We encourage you to add new entity types! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.

If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic)

## License
Entity Synthesis Definitions is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
