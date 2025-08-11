# Relationship Synthesis

Entities and relationships provide the connective tissue for telemetry data.

They enable visualization and exploration of large data sets across account boundaries, functioning as the building blocks for a unified, 
connected user experience for different products where users can explore, navigate and troubleshoot their complex systems.

In this context, Relationship synthesis provides an easy-to-use mechanism to detect and create relationships.

It enables New Relic product teams, solutions consultants and customers to create topologies of connected entities in order to extend the 
New Relic platform to provide data-driven insights and empower the world’s engineers to build better digital experiences.

From a technical point of view, Relationship synthesis is a mechanism that detects and creates relationships out of telemetry through applying 
predefined rules on telemetry data points. It supports creating relationships to both instrumented and uninstrumented entities 
while providing powerful capabilities to identify both ends of a potential relationship.

In the next section, we explain the steps needed to define a new Relationship Synthesis rule.

# How to create a new Relationship Synthesis rule 

In the same way Entities are synthesized through predefined rules from telemetry, 
we want to offer a similar mechanism to connect two entities with a relationship. 
This is achieved through the creation of relationship synthesis rules.

In order to create a new relationship synthesis rule, we need to follow the given steps:

1. Create a `<ENTITY_TYPE-to-ENTITY_TYPE>.yml` file under the `relationships/synthesis` directory.
   1. In this directory, you'll find all existing relationship synthesis rules, 
   so it's also an excellent source of inspiration for crafting new ones.

Example: 

```
entity-definitions/
| - definitions/ (entityTypes)
  ...
| - relationships/
  | - candidates/
  | - synthesis/
    | EXT-SERVICE-to-EXT-PIXIE-DNS.yml
    ...
```

2. Fill in the required fields (`name`, `version`, `origins`, `conditions`, `relationship`)
following the instructions in the [next section](#how-to-configure-a-new-candidate-relationship).

3. Create a new pull request and make sure all the automatic validations are successfully executed.

4. Wait for our team to review the pull request and iterate on the feedback.

5. Once approved, merged to the main branch and a new release is issued, it is available for you to use.

6. Enjoy your new relationship synthesis rule being applied automatically to your data! :tada:

# How to configure a new Relationship Synthesis rule 

Relationship synthesis allows users to determine and create relationships based on provided rules in a simple two-phase process.

**[Define the Data Source](#define-the-data-source)**: First, you need to determine the data source from which the relationship will be derived. 
You can refer to the example below and to the [origins section](#origins) to understand how to identify the relevant attributes and values
and apply [conditions](#conditions) to them.

**[Create the Relationship Rule](#create-the-relationship-rule)**: Next, you'll define the relationship rule that specifies how the relationship will be created from the data source. 

This involves deciding how to apply the existing resolvers to the [source and target](#source--target) entities:

a. Extract: Use the `extractGuid` operation to specify how to determine the GUID for the source and target entities.

b. Build: Utilize the `buildGuid` operation to define the relationship type (guid to guid, candidate, or proposal) and how the source and target GUIDs should be created.

c. Lookup: If the GUID cannot be inferred directly from the data source, you can use the `lookupGuid` resolver to perform a lookup using candidates, 
as described in the dedicated documentation.

By following these steps, users can easily create meaningful relationships between entities based on their specific requirements. 

Example of a complete relationship definition:

```yaml
relationships:
  - name: extServiceCallsExtPixieDns
    version: "1"
    origins:
      - OpenTelemetry
    entitlements:
      matching: anyOf
      values:
        - advanced_ccu
    conditions:
      - attribute: entity.type
        anyOf: [ "PIXIE_DNS" ]
    relationship:
      expires: P75M
      relationshipType: CALLS
      source:
        buildGuid:
          account:
            attribute: accountId
          domain:
            value: EXT
          type:
            value: SERVICE
          identifier:
            fragments:
              - attribute: service.name
            hashAlgorithm: FARM_HASH
      target:
        extractGuid:
          attribute: entity.guid
```

In the provided example, you can observe the various sections of a valid relationship definition: `name`, `origins`, `conditions` and `relationship`. 
Each of these sections is necessary for the rule to be considered valid.

Below, we offer a more detailed explanation of how to complete each section properly.

## Define the data source

### Name

The name property serves as a unique identifier for the rule and must be distinct from all other rules. 
It should adhere to the `camelCase` format.

Example:

```yaml
# APM-APPLICATION-to-DATABASE.yml
- name: apmCallsDatabase
# APM-APPLICATION-to-INFRA-REDISINSTANCE.yml
- name: apmApplicationCallsInfraRedisInstance
# EXT-SERVICE-to-EXT-PIXIE-REDIS.yml
- name: extServiceCallsExtPixieRedis
```

### Version

The `version` field indicates the rule version. This allows for introducing new breaking changes to the formats 
without requiring immediate updates to all engines. 
The engine discards any unsupported versions.

The expected data format for this field is a string representation of an integer.

Example:

```yaml
    version: "1"
```

### Origin(s)

The `origins` field represents a closed list of values that indicate the source of telemetry. When defining a rule, a list of these values must be provided.

Example:

```yaml
- origins:
    - OpenTelemetry
```

The full list of supported origins (as of July 2023) is the following:

| **Origin source**      | **Description**                                                                                                                                                                                          |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| APM Metrics            | Uses metric timeslice data generated by the [New Relic APM](https://docs.newrelic.com/introduction-apm/) agent(s). More information [here](https://docs.newrelic.com/docs/data-apis/understand-data/metric-data/query-apm-metric-timeslice-data-nrql/). |
| Infrastructure Agent   | Uses data generated by the [New Relic Infrastructure Agent(s)](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/get-started/install-infrastructure-agent/).                                                                                                                                      |
| Metric API             | Uses data generated by [New Relic metrics API product](https://docs.newrelic.com/docs/data-apis/ingest-apis/metric-api/introduction-metric-api/).                                                                                                                                                        |
| Distributed Tracing    | Uses data generated by the [New Relic Distributed Tracing product](https://docs.newrelic.com/docs/distributed-tracing/concepts/introduction-distributed-tracing/).                                                                                                                                        |
| AWS Integration        | Uses data generated by the [New Relic AWS Integration](https://docs.newrelic.com/docs/infrastructure/amazon-integrations/get-started/introduction-aws-integrations/).                                                                                                                                                    |
| GCP Integration        | Uses data generated by the [New Relic GCP Integration](https://docs.newrelic.com/docs/infrastructure/google-cloud-platform-integrations/get-started/introduction-google-cloud-platform-integrations/).                                                                                                                                                    |
| Azure Integration      | Uses data generated by the [New Relic Azure Integration](https://docs.newrelic.com/docs/infrastructure/microsoft-azure-integrations/get-started/introduction-azure-monitoring-integrations/).                                                                                                                                                  |
| Kubernetes Integration | Uses data generated by the [New Relic Kubernetes Integration](https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/get-started/introduction-kubernetes-integration/).                                                                                                                                             |
| Pixie                  | Uses data generated by the [New Relic Pixie Integration](https://docs.newrelic.com/docs/kubernetes-pixie/auto-telemetry-pixie/get-started-auto-telemetry-pixie/).                                                                                                                                                  |
| Prometheus             | Uses data generated by the [New Relic Prometheus Integration](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/get-started/send-prometheus-metric-data-new-relic/).                                                                                                                                             |
| OpenTelemetry          | Uses data generated by [OpenTelemetry Integrations](https://docs.newrelic.com/docs/more-integrations/open-source-telemetry-integrations/opentelemetry/opentelemetry-introduction/).                                                                                                                                          |
| OnHost Integration     | Uses data generated by the [New Relic OnHost Integration](https://docs.newrelic.com/docs/infrastructure/host-integrations/installation/install-infrastructure-host-integrations/).                                                                                                                                                 |
| Browser Monitoring     | Uses data generated by the [New Relic Browser Monitoring](https://newrelic.com/platform/browser-monitoring/).        
| Mobile Monitoring      | Uses data generated by the [New Relic Mobile Monitoring](https://newrelic.com/platform/mobile-monitoring/).        

One rule can be applied to multiple sources, as shown in the example. These origins are used by our internal services 
to filter which rules to evaluate and which ones to ignore. 
The mapping of origins to sources allows for performance improvements when evaluating rules via the matching system.

### Entitlements

Optionally, you can create a rule that will only match if the account of the telemetry has the required entitlements.


```yaml
entitlements:
  matching: anyOf
  values:
    - advanced_ccu
```

#### Matching

Defines how the entitlements will be matched.
Only `anyOf` is allowed.

#### Values

Defines the names of the entitlements to match.
The account producing the telemetry must contain the entitlements in order for the rule to match.


The entitlements to use is a closed list defined below:

| **Entitlement** | **Description** |
|-----------------|-----------------|
| advanced_ccu    | Controls whether certain advanced capabilities are accessible in the product |
| catalog_ccu     | Controls whether customers can use Catalogs in the product |
| catalogs_discount_usage | Trial version of the above |
| auto_discovery_entities_ccu | Controls whether customers can enable and use Auto Discovery |
| auto_discovery_entities_ccu_discount_usage | Trial version of the previous one |
| advanced_maps_ccu | Controls whether customers can use advanced maps (infrastructure maps and Dynamic Flow Maps) |
| advanced_maps_discount_usage | Trial version of the previous one |

If you need an entitlement not in the list reach us.


### Conditions

`Conditions` are used to determine if a rule should be applied to a given data point. 
The proposal for `conditions` is an iterative improvement over the existing rules format to allow for 
future changes without major breaking updates.

A `condition` is composed by an `attribute` and a matcher (that can be of multiple types), we explain what are 
the valid combinations on the next sub-sections.

#### Attribute
The `attribute` field specifies the name of the attribute in the data point, 
and the operation to perform is defined below using matchers.

#### Operation(s)

The operation describes the action to be performed on a given data point to extract its information. 

The list of supported operations can be found on the table below:

| **Matcher**            | **Description**                                                                                       |
|------------------------|-------------------------------------------------------------------------------------------------------|
| present                | Commonly used with a specific attribute, to match it on the telemetry data point.                     |
| anyOf                  | Commonly used with the `eventType` attribute, to match a list of events.                              |
| startsWith             | Commonly used with the `metricName` attribute, to match on the prefix of the metric.                  |
| regex                  | Commonly used with the `metricName` attribute, to extract match more complex use cases (e.g. URI(s)). |

Only one matcher should be present in each condition, and matching is case-insensitive by default unless 
specified otherwise with `caseSensitive: true`. 
Multiple conditions must all match for the rule to apply; there is no support for `OR` conditions.

In the following subsections, we will provide an example for each possible matcher usage.

##### present

Example:

```yaml
conditions:
  - attribute: host.guid
    present: true
```

##### anyOf

Example:

```yaml
conditions:
  - attribute: eventType
    anyOf: ["NginxSample", "K8sPodSample", "K8sContainerSample"]
```

##### startsWith 

Example:

```yaml
conditions:
  - attribute: metricName
    startsWith: "DurationByCaller/"
    caseSensitive: true
```

##### regex 

Example:

```yaml
conditions:
  - attribute: metricName
    regex: ".*\.rds\.amazonaws\.com.*"
    caseSensitive: false
```

## Create the Relationship Rule 

### Relationship

The `relationship` section defines aspects related to the relationship we want to synthesize.

Example of a valid relationship section:

```yaml
    relationship:
      expires: P75M
      relationshipType: CALLS
      source:
        buildGuid:
          account:
            attribute: accountId
          domain:
            value: EXT
          type:
            value: SERVICE
          identifier:
            fragments:
              - attribute: service.name
            hashAlgorithm: FARM_HASH
      target:
        extractGuid:
          attribute: entity.guid
```

In the provided example, you can observe the various sections of a valid relationship section: `expires`, `relationshipType`, `source` and `target`.
Each of these sections is necessary for the relationship section to be considered valid.

Below, we offer a more detailed explanation of how to complete each part properly.

#### Expires

The `expires` field allows configuring the duration for which the relationship should exist if it is not reported within that timeframe. 
By default, this field is set to ***75 minutes*** (the default for the relationship platform). 
The value for expires follows the `ISO-8601` format and must be between ***10 minutes*** and ***72 hours*** (inclusive), which is the time interval 
currently supported by the platform.

Explicitly providing the expires field is recommended for clarity, even though the default is 75 minutes.

#### RelationshipType

The `relationshipType` field specifies the type of relationship to create. Only predefined values from the 
supported relationship types list are accepted.

The full list of supported relationship type options (as of July 2023) is the following:

| **Relationship type** | **Description**                                                                                                                |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------|
| CONTAINS              | Represents the set relationship between two or more entities (e.g. A cloud region contains a set of Virtual Machines)          |
| CALLS                 | Represents that one entity calls another (e.g. API calls between downstream and upstream services).                            |
| HOSTS                 | Represents that one entity hosts another (e.g. One application that runs on top of a given Virtual Machine).                   |
| SERVES                | Represents that one entity serves another (e.g. A backend application serves HTTP requests to a browser application).          |
| IS                    | Represents that both entities linked by this relationship are perspectives of the same thing.                                  |
| OPERATES_IN           | Represents that one entity operates using another (e.g. A host operates in a certain region or datacenter.                     |
| CONNECTS_TO           | Represents that one entity is connected to another (e.g. Interconnected network endpoints).                                    |
| BUILT_FROM            | Represents that one entity was built using data from another (e.g. a git repository contains code for an application).         |
| MEASURES              | Represents that one entity measures another in some way.                                                                       |
| PRODUCES              | Indicates that an application or process produces messages to a system (e.g. one application produces messages to a queue).    |
| CONSUMES              | Indicates that an application or process consume messages from a system (e.g. one application consumes messages from a queue). |
| MANAGES               | Indicates that a system manages other subsystems (e.g. queue managers managing their queues).                                  |
| OWNS                  | Indicates ownership of one entity to the other via their relationship.                                                         |
| TEST                  | Used for testing purposes, might be a good option for experimentation.                                                         |

##### Source & Target

Source and Target define the methods for determining the GUIDs of both entities involved in the relationship. 
To achieve this, we provide support for the following GUID resolvers:

1. `extractGuid`: Extracts the GUID from an existing attribute in the telemetry.
2. `buildGuid`: Constructs the GUID using various pieces of information from the telemetry.
3. `lookupGuid`: Performs a GUID lookup based on telemetry attributes. 

###### extractGuid

The `extractGuid` resolver is the simplest and allows specifying an attribute to use as the GUID.

Example:

```yaml
  source:
    extractGuid:
      attribute: entity.guid
  target:
    extractGuid:
      attribute: cluster.guid 
```

Another additional feature of the `extractGuid` is the ability to define the entity type.

In the example below, you'll see how to define the entity type using an attribute in the target relationship.

Example:

```yaml
  source:
     extractGuid:
        attribute: entity.guid
  target:
    extractGuid:
      attribute: cluster.guid
```

Lastly, in special cases, you can provide a hardcoded value for the entityType. 
We briefly discuss this in its dedicated section [here](#infra-na-for-extractguid).

###### buildGuid

The `buildGuid` resolver allows constructing the GUID from different pieces of information.

Entity GUIDs are composed of 4 parts: `account`, `domain`, `type` and `identifier`. 

You can read more about the usage of those fields on the GUID [here](../entities/guid_spec.md).

Example:

```yaml
source:
  buildGuid:
    account:
      attribute: accountId
      # or lookup: true
    domain:
      value: EXT
    type:
      value: SERVICE
    identifier:
      fragments:
      - value: "k8s:"
      - attribute: "service.name"
      - value: ":pod:"
      hashAlgorithm: FARM_HASH
```

The `account` field can be defined using an attribute in the telemetry or by specifying a lookup attribute. 
When a lookup attribute is defined, it will be searched within the accounts of the trusted account for the current data point.

The `domain` and `type` fields can be either hardcoded values or attributes.

The `identifier` can be constructed using one or multiple fragments. 
Each fragment can be either a `hardcoded string`, an `attribute value`, or a `part of an attribute value`.

Aditionally, you can also specify operations on strings, like toLowerCase or toUpperCase as such:

```yaml
identifier:
   fragments:
   - value: "k8s:"
   - attribute: "service.name"
     operations:
        - operation: toUpperCase
   - value: ":pod:"
   hashAlgorithm: FARM_HASH
```

Optionally, the identifier can be hashed using one of the supported algorithms. Currently, the only supported algorithm is `farmHash`.

Finally, for specific scenarios, you have the option to extract the `type` from the GUID. 
We provide a brief discussion of this feature in its dedicated section [here](#infra-na-for-buildguid).

###### lookupGuid
The `lookupGuid` resolver comes into play when the GUID cannot be determined from the telemetry, requiring a lookup 
process using [candidates](candidate_relationships.md).

**Candidate relationships** serve as a powerful mechanism for handling more intricate use cases and are 
further explained in their [dedicated documentation](candidate_relationships.md).

Make sure to explore this resource if you find situations where your desired relationship 
cannot be created using only `extractGuid` or `buildGuid`.

Example:

```yaml
lookupGuid:
  candidateCategory: DATABASE
  fields:
    - field: endpoint
      attribute: aws.db.host
```

The `lookupGuid` points to the candidate category to be used and maps the fields required for the lookup to the attributes in the telemetry.

##### Dealing with unknown infrastructure types

Due to internal limitations, we cannot precisely know the type for some infrastructure entity domainTypes.
Due to that, we need to provide type hints for relationships in some scenarios.
Below we explain how to overcome this issue by resolver type.

###### INFRA-NA for extractGuid

In case the resolved GUID corresponds to an `INFRA-NA` GUID, it is necessary to supply the actual type
associated with the GUID. This can be accomplished by providing a second field that either specifies
a hardcoded value for the entity type or retrieves it from an existing attribute.

In the following definition, you'll find an instance of a hardcoded entity type used in the source relationship,
as well as an example of using an attribute to define the entity type in the target relationship.

Example:

```yaml
  source:
    extractGuid:
      attribute: host.guid
      entityType:
        value: HOST
  target:
    extractGuid:
      attribute: entityGuid
      entityType:
        attribute: nr.entityType
```

###### INFRA-NA for buildGuid

The `type` field enables you to specify the `value` as the type in the GUID using `valueInGuid`,
which is particularly helpful for constructing `INFRA-NA` GUIDs.

In other words, in scenarios where a GUID contains `NA` as its `type`, the `value` fields will be used instead.
For instance, in the example below, the `SERVICE` value will replace `NA`:

```yaml
source:
  buildGuid:
    account:
      attribute: accountId
    domain:
      value: EXT
    type:
      value: SERVICE
      valueInGuid: NA
    identifier:
      fragments:
      - value: "k8s:"
      - attribute: "service.name"
      - value: ":pod:"
      hashAlgorithm: FARM_HASH
```
