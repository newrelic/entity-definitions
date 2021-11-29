# Documentation

This document will walk you through creating a new entity type from scracth, is useful to understand the implications of each section
but if you are looking only for the configuration options here is the list:

- [GUID Spec][guid_spec]
- [Synthesis rules][synthesis]
- [Lifecycle][lifecycle]
- [Entity Summary][entity_summary]
- [Golden Metrics][golden_metrics]
- [Golden Tags][golden_tags]
- [Summary Metrics][summary_metrics]

## Main concepts

Before starting this journey you need a clear understanding of the main concepts related to entities.

If entities are a new concept to you check our documentation on [what is an entity](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/what-entity-new-relic/).

You can also read about our [GUID and how it's composed][guid_spec] to better understand some concepts.

## The PiHole entity

For the example we will create a [PiHole](https://pi-hole.net/) entity.
This is an actual New Relic entity that you can find the [definition here](https://github.com/newrelic/entity-definitions/tree/main/definitions/ext-pihole).

One of the first questions that we need to answer is where are we going to get the telemetry from, in this case we will use prometheus with [pihole-exporter](https://github.com/eko/pihole-exporter).

Then we need to decide on the main [segments of a guid][guid_spec].
For the domain we will use the recommended one (`EXT`), since we are instrumenting a PiHole we will name the type `PIHOLE`

We can start by cloning this repository and adding a new folder `ext-pihole` into the `definitions` folder.
Then we will create a `definition.yml` file inside and fill it with the information we have decided so far:

```yaml
domain: EXT
type: PIHOLE
```

<details>
	<summary>Different sources of data</summary>
	Through the document you will see this section on different places,
	it will extend information about the configurations when you are providing multiple sources and shapes of data for the same entity type, if you are only concerned with one source & shape of data you can ignore these.

	This sections will use one source of data from the [pihole-exporter](https://github.com/eko/pihole-exporter) and a second source of data from a made-up example named **pihole-windows**.

	When using multiple sources of data there are two special attributes in the telemetry: `instrumentation.name` and `instrumentation.provider`. These attributes are used to understand which sources & shapes of data we are currently consuming and act accordingly.

	You can use only `instrumentation.provider` or combine `instrumentation.provider` and `instrumentation.name` together.
	In the configuration files when both are used it will look similar to: `$instrumentation.name/$instrumentation.provider` 

	The pihole.exporter will provide an attribute named `insturmentation.name: pihole-exporter` and the windows one will use `instrumentation.name: pihole-windows`
</details>

## Create entities

With the previous work we have successfully created a new entityType in New Relic.
But an empty entityType doesn't provide much value, so we need to define some rules on how to create entities from the telemetry those entities report.

We call this process [synthesis][synthesis].

A datapoint needs to contain at least two attributes in the rule in order to identify and generate an entity, those are `identifier` and `name`.

<!--
TODO: add an image or table on the PiHole telemetry here.
-->

After checking PiHole telemetry we decided on `hostname` being the name of the entity and also the identifier.
So we add that information into the definition file.

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    name: hostname
```

In this case we have defined the same attribute for both. But if there was a better attribute for the name of the entity, you can use a different one. We do **not** require the name to be unique.

The current definition will generate us some PiHole entities but we have two big problems yet to address.

The first one is that the value of `hostname` could be bigger of what our [GUID limits][guid_spec] allow.
In order to fix that we can encode the hostname value into a value that will be within the limits.
This can be done for you by providing `encodeIdentifierInGUID: true` to the rule.

```yaml
domain: EXT
type: PIHOLE

synthesis:
  rules:
  - identifier: hostname
    encodeIdentifierInGUID: true
    name: hostname
```

The second problem we face is that this rule is too broad. Any telemetry that contains a `hostname` attribute will create a PiHole entity, that means pretty much any host out there will also match on this rule and create a PiHole entity.

We need a way to restrict the rule more, we know that the [pihole-exporter](https://github.com/eko/pihole-exporter) will only produce metrics with the prefix `pihole_` as part of the `metricName` attribute, so we can add a condition to the rule that only matches those metrics.

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

With these changes we now have a rule that matches our telemetry, is not too broad to match other telemetry and respects the GUID limits.

Check our [synthesis docs][synthesis] to get more examples on how to use it and what options are available.

We can also enhance the rule to copy attributes of the telemetry as tags of the entity.
Let’s imagine we have a horde of PiHole machines deployed in amazon. And we want to search for all the PiHole entities that are in a specific availability zone.

If the telemetry sends that information using the attribute `aws.az` we can tell our rule to copy that attribute into the entity as a tag.

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
In the example we are only providing one rule, but if you had different sources of data that matched different conditions you can add more rules into the `rules` section.

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

At this point we have a new entity type and one rule that creates entities matching telemetry.

Now we need to decide on two main properties of the entity.
Can we set up alerts for this entity? If the answer is yes we need to add a new property called `alertable` as part of the configuration section.

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

The last question is how long should we keep the entity after it stopped reporting telemetry?

Imagine you have a PiHole server and it suddenly shuts down so it stops reporting telemetry. If we deleted the entity at that same moment you couldn’t try to debug why it stopped in the first place!

That’s why we default to keeping the entity for eight days. But you can see more options on our [lifecycle docs][lifecycle]

## Entity summary

Now we are creating entities and we ensure that they are being deleted on a reasonable period of time after they stop reporting. Next we will focus on how we display them.

The first thing we create is the entity summary, this is the view the user will see when it opens the entity

<!--
TODO: [screen of a pihole entity summary]
-->

Create a file named `dashboard.json` and reference it into the `definition.yml` file

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

The easiest way to create an overview is to actually [build a dashboard](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/introduction-dashboards/)

After you have a dashboard that looks how you would like the overview of an entity to be, [export it as json](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/dashboards-charts-import-export-data/#dashboards) and copy the content into the `dashboard.json` file.

<details>
  <summary>Different sources of data</summary>
When you have different sources of data you can create multiple dashboards for each provider.
The only requirement is that the json files end up with `dashboard.json` as the name.

And the definition would look similar to

```yaml
dashboardTemplates:
  pihole-exportert:
    template: pihole-exporter-dashboard.json
  pihole-windows:
    template: pihole-windows.json
```
</details>

You can check more information about [entity overview in our docs][entity_overview]

## Golden Metrics

Your entity will probably have a lot of metrics and information to display, but in-between all that information there’s always a few metrics that are the main ones.

Golden metrics is the list of those important metrics. For example a `HOST` will focus on CPU, memory, network & disk space while an `APPLICATION` is more concerned on response times, throughput and error counts.

For our `PIHOLE` entity we will define two metrics, the total DNS queries received and the number of ads blocked.

First you will need to create a file named `golden_metrics.yml` under your entity type folder.

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

These queries will display in the following way in New Relic

<!--
TODO [Images of how it looks in a few places in the UI ]
-->

<details>
  <summary>Different sources of data</summary>
We can define the same golden metric with different queries for each provider

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

You can check more information on [golden metrics configuration options in our docs][golden_metrics]
You can also define [golden tags for your type][golden_tags]

## Summary metrics

Summary metrics are also a definition of important metrics for your entity type,
The main change is where they are used, these metrics will only be displayed in the [Explorer list view](https://docs.newrelic.com/docs/new-relic-one/use-new-relic-one/core-concepts/new-relic-explorer-view-performance-across-apps-services-hosts/#find)


Our recommendation is to provide at most three metrics to display and make them the same as the golden metrics.

We are working towards removing this definition and it will use the golden metrics in the future.
In order to provide summary metrics you need to create a file named `summary_metrics.yml` inside the entity type folder.

We will provide the same golden metrics as summary metrics for our PiHole entities.

```yaml
totalQueries:
  title: Total queries
  unit: COUNT
  queries:
    newRelic:
      select: latest(pihole_dns_queries_all_types)
      from: Metric
      eventId: entity.guid
adsBlockedToday:
  title: Ads Blocked Today
  unit: COUNT
  queries:
    newRelic:
      select: latest(pihole_ads_blocked_today)
      from: Metric
      eventId: entity.guid
```

<!--
TODO: [image of the list view displaying these metrics]
-->

As you can see the configurations are mostly the same as the golden metrics.

<details>
  <summary>Different sources of data</summary>
We can define the same summary metric with different queries for each provider

```yaml
totalQueries:
  title: Total queries
  unit: COUNT
  queries:
    pihole-exporter:
      select: latest(pihole_dns_queries_all_types)
      from: Metric
      eventId: entity.guid
    pihole-windows:
      select: latest(all_dns_queries)
      from: Metric
      eventId: entity.guid
```
</details>

You can check more information on [summary metrics configuration options in our docs][summary_metrics]

## Wrapping up

With all this we have a working definition of a new entityType, you can now commit the changes and open a new PR for it.

After we merge it and create a new release all New Relic users will take advantage of your contribution!
By default all entity types will display under `Your system` category in the Explorer.

This can be changed if you think that is not the best place for your new type but you will need to ask us for that change when opening the PR.

[guid_spec]: guid_spec.md
[synthesis]: synthesis.md
[lifecycle]: lifecycle.md
[entity_summary]: entity_summary.md
[golden_metrics]: golden_metrics.md
[golden_tags]: golden_tags.md
[summary_metrics]: summary_metrics.md