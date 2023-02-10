# Documentation

This document will walk you through creating a new entity type from scratch. While it's useful to understand the implications of each section, you can skip to the configuration options from the following list:

- [GUID Spec][guid_spec]
- [Synthesis rules][synthesis]
- [Lifecycle][lifecycle]
- [Entity Summary][entity_summary]
- [Golden Metrics][golden_metrics]
- [Golden Tags][golden_tags]
- [Summary Metrics][summary_metrics]

## Main concepts

Before starting this journey you need a clear understanding of the main concepts regarding entities:

 * If entities are a new concept to you, check our documentation on [what's an entity](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/what-entity-new-relic/).
 * You can also read about our [GUID and how it's composed][guid_spec] to better understand some concepts.

## Quick reference

Overall, these are the files you can provide to configure your new entity:
* `definition.yml` to define the entity type and main properties **(required)**
* `dashboard.json` to configure how the new entity would look like in New Relic One
* `golden_metrics.yml` to define the golden metrics for the entity type
* `summary_metrics.yml` to define the summary metrics for the entity type

## The PiHole entity

For example, let's create a [PiHole](https://pi-hole.net/) entity. This is an actual New Relic entity, and you can read more [here](https://github.com/newrelic/entity-definitions/tree/main/definitions/ext-pihole).

We need to answer the following questions:

 * Where is the entity's telemetry from? In this case, we use Prometheus with [pihole-exporter](https://github.com/eko/pihole-exporter).
 * Which are the main [segments of a guid][guid_spec]? For the domain, we use the recommended `EXT`. Since we're instrumenting a PiHole, we'll name the type `PIHOLE`.

To continue, clone this repository, and add a new folder `ext-pihole` into the `definitions` folder. Next, create a `definition.yml` file inside, and complete it with the information we've decided so far:

```yaml
domain: EXT
type: PIHOLE
```

<details>
	<summary>Different sources of data</summary>
	Throughout the document you'll see this section on different places: It contains configuration information when you're providing multiple sources and shapes of data for the same entity type. Ignore it if you're only concerned with one source and shape of data.

	These sections use one source of data from the [pihole-exporter](https://github.com/eko/pihole-exporter), and a second source of data from a made-up example named **pihole-windows**.

	When using multiple sources of data there are two special attributes in the telemetry: `instrumentation.name` and `instrumentation.provider`. These attributes are used to understand which sources and shapes of data we're currently consuming, and act accordingly.

	You can use `instrumentation.provider` only, or combine `instrumentation.provider` and `instrumentation.name` together. When both are used, configuration files look similar to `$instrumentation.name/$instrumentation.provider`. 

	The pihole.exporter provides an attribute named `insturmentation.name: pihole-exporter`, while the windows exporter uses `instrumentation.name: pihole-windows`.
</details>

## Create entities

After following the steps above we've successfully created a new `entityType` in New Relic. But an empty `entityType` doesn't provide much value, so we need to define some rules on how to create entities from the telemetry those entities report. **We call this process [synthesis][synthesis].**

A datapoint needs to contain at least two attributes in the rule in order to identify and generate an entity: `identifier` and `name`.

<!--
TODO: add an image or table on the PiHole telemetry here.
-->

After checking PiHole telemetry, we decided the name of the entity (and also the identifier) would be `hostname`. Let's add that information to the definition file:

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    name: hostname
```

In this case we've defined the same attribute for both. If there's a better attribute for the name of the entity, use it. We do **not** require the name to be unique.

While the current definition generates some PiHole entities, we have two big problems yet to address.

The first one is that the value of `hostname` could be bigger than what our [GUID limits][guid_spec] allow. To fix it, we can encode the hostname value to a value within the limits by adding `encodeIdentifierInGUID: true` to the rule.

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    encodeIdentifierInGUID: true
    name: hostname
```

The second problem we face is that this rule is too broad: Any telemetry that contains a `hostname` attribute will create a PiHole entity. This means pretty much any host out there will also match this rule and create a PiHole entity. We need the rule to be more restrictive. 

We know that the [pihole-exporter](https://github.com/eko/pihole-exporter) only produces metrics with the prefix `pihole_` as part of the `metricName` attribute, so we can add a condition to the rule that only matches those metrics:

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    encodeIdentifierInGUID: true
    name: hostname
    conditions:
    - attribute: metricName
      prefix: pihole_
```

With these changes we now have a rule that matches our telemetry, isn't too broad to match other telemetry, and respects the GUID limits.

Check our [synthesis docs][synthesis] to get more examples on how to use it and what options are available.

**Use tags**

We can also enhance the rule to copy attributes of the telemetry as tags of the entity. 

Let’s imagine we have a horde of PiHole machines deployed in Amazon, and we want to search for all the PiHole entities that are in a specific availability zone. If the telemetry sends that information using the attribute `aws.az`, we can tell our rule to copy that attribute into the entity as a tag:

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    encodeIdentifierInGUID: true
    name: hostname
    conditions:
    - attribute: metricName
      prefix: pihole_
  tags:
     aws.az:
``` 

We also support a few other features for tags that you can check in the [synthesis docs][synthesis].

<details>
  <summary>Different sources of data</summary>
In the example we're only providing one rule, but if you have different sources of data that match different conditions you can add more rules to the `rules` section.

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
    # telemetry with piHoleName attribute
    # this will bring the attribute instrumentation.name: pihole-windows
  - identifier: piHoleName
    name: piHoleName
    encodeIdentifierInGUID: true
    conditions:
    - attribute: piHoleName

    # telemetry from prometheus exporter
   # this will bring the attribute instrumentation.name: pihole-exporter
  - identifier: hostname
    name: hostname
    encodeIdentifierInGUID: true
    conditions:
    - attribute: metricName
      prefix: pihole_:
```
</details>

## Entity Lifecycle

We now have a new entity type and one rule that creates entities matching telemetry. Next we need to decide on two main properties of the entity: alerts, and the entity's end of life.

### Set up alerts

Can we set up **alerts** for this entity? If the answer is yes, we need to add a new property called `alertable` as part of the configuration section:

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    encodeIdentifierInGUID: true
    name: hostname
    conditions:
    - attribute: metricName
      prefix: pihole_
  tags:
     aws.az:

configuration:
  alertable: true
```

### Delete entities

The last question is how long should we keep the entity after it has stopped reporting telemetry?

Imagine you have a PiHole server and it suddenly shuts down so it stops reporting telemetry. If we deleted the entity right away, you wouldn't be able to debug why it stopped in the first place! That’s why we default to keeping the entity for eight days. See more options in our [lifecycle docs][lifecycle].

## Entity summary

To recap, we're creating entities, and we're making sure they're being deleted within a reasonable period of time after they stop reporting. Next we'll focus on **how we display** them.

The first thing we create is the entity summary: The view you'll see when you open the entity.

<!--
TODO: [screen of a pihole entity summary]
-->

Create a file named `dashboard.json`, and reference it in the `definition.yml` file:

```yaml
domain: EXT
type: PIHOLE

synthesis:
     # ...

dashboardTemplates:
  newRelic:
    template: dashboard.json

configuration:
  # ...
```

The easiest way to create a summary is to [build a New Relic One dashboard](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/). Once the dashboard looks like your desired entity summary, [export it as json](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/dashboards-charts-import-export-data/#dashboards), and copy the content to the `dashboard.json` file.

<details>
  <summary>Different sources of data</summary>
When you have different sources of data you can create multiple dashboards for each provider. The only requirement is that the json files end up with `dashboard.json` as the name, and the definition should look similar to:

```yaml
dashboardTemplates:
  pihole-exporter:
    template: pihole-exporter-dashboard.json
  pihole-windows:
    template: pihole-windows.json
```
</details>

You can check more information about [an entity's summary in our docs][entity_summary].

## Golden Metrics

Your entity will probably have a lot of metrics and information to display, but among all that information there’s always a few metrics that stand out: we call them **Golden metrics**. For example, a `HOST` focuses on CPU, memory, network, and disk space, while an `APPLICATION` is more concerned on response times, throughput, and error counts.

For our `PIHOLE` entity we will define two metrics: The total amount of DNS queries received, and the number of ads blocked.

First you need to create a file named `golden_metrics.yml` under your entity type folder:

```yaml
totalQueries:
  title: Total queries
  unit: COUNT
  queries:
    newRelic:
      select: latest(pihole_dns_queries_all_types)
adsBlockedToday:
  title: Ads Blocked Today
  unit: COUNT
  queries:
    newRelic:
      select: latest(pihole_ads_blocked_today)
```

These queries will be displayed in the following way in New Relic:

<!--
TODO [Images of how it looks in a few places in the UI ]
-->

<details>
  <summary>Different sources of data</summary>
We can define the same golden metric with different queries for each provider.

```yaml
totalQueries:
  title: Total queries
  unit: COUNT
  queries:
    pihole-exporter:
      select: latest(pihole_dns_queries_all_types)
    pihole-windows:
      select: latest(all_dns_queries)
```
</details>

See more information on [golden metrics configuration options in our docs][golden_metrics]. You can also define [golden tags for your type][golden_tags].

## Summary metrics

Summary metrics are also important for your entity type. Unlike golden metrics, summary metrics are only displayed in the [Explorer list view](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-explorer-view-performance-across-apps-services-hosts/#find). We recommend to provide at most three metrics to display, and match them to golden metrics. We're working towards removing this definition, and only use golden metrics in the future.

In order to provide summary metrics you need to create a file named `summary_metrics.yml` inside the entity type folder. Each metric has to reference an existing golden metric. For example, for our PiHole entities we will define it as follows.

```yaml
totalQueries:
  title: Total queries
  unit: COUNT
  goldenMetric: totalQueries
adsBlockedToday:
  title: Ads Blocked Today
  unit: COUNT
  goldenMetric: adsBlockedToday
```

<!--
TODO: [image of the list view displaying these metrics]
-->

Read on [summary metrics configuration options in our docs][summary_metrics].

## Wrapping up

With all this we have a working definition of a new entityType: Commit the changes and open a new PR! After we merge and release, all New Relic users will take advantage of your contribution!

By default all entity types will display under `Your system` category in the Explorer.
If you want to change this or other UI properties you will need to open a PR into `entity-platform/entity-type-ui-definitions-service` repository.
This requires access to our private github, so if you don't have that let us know on the PR and we will made the changes for you.


[guid_spec]: guid_spec.md
[synthesis]: synthesis.md
[lifecycle]: lifecycle.md
[entity_summary]: entity_summary.md
[golden_metrics]: golden_metrics.md
[golden_tags]: golden_tags.md
[summary_metrics]: summary_metrics.md
