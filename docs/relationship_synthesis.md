# [Experimental] Relationship Synthesis

Entities and relationships provide the connective tissue for telemetry data.

They enable visualization and exploration of large data sets across account boundaries, functioning as the building blocks for a unified, 
connected user experience for different products where users can explore, navigate and troubleshoot their complex systems.

In this context, Relationship synthesis provides an easy-to-use mechanism to detect and create relationships.

It enables New Relic product teams, solutions consultants and customers to create topologies of connected entities in order to extend the 
New Relic platform to provide data-driven insights and empower the world’s engineers to build better digital experiences.

Relationship synthesis rules are a set of rules defined in this repository that are used in the process of relationship synthesis.

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
   1. This directory holds all pre-existing relationship synthesis rules, and is also a 
   good source of inspiration for creating new rules.

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
following the instructions on the [next section](#how-to-configure-a-new-candidate-relationship).

3. Create a new pull request and make sure all the automatic validations are successfully executed.

4. Wait for our team to review the pull request and iterate on the feedback.

5. Once approved, merged to the main branch and a new release is issued, it is available for you to use.

6. Enjoy your new relationship synthesis rule being applied automatically to your data! :tada:

# How to configure a new Candidate Relationship

Relationship synthesis involves a two-phase system to determine and create relationships based on the provided rules.

In the first phase, the system verifies if a data point should be considered for creating a relationship by performing duck typing.
This means checking if the data point has all the required attributes and values specified by the rules.

In the second phase, the data point is used to create a relationship according to the defined rule,
which specifies the relationship type (guid to guid, candidate, or proposal)
and how the source and target GUIDs should be created.

Example of a valid relationship definition:

```yaml
relationships:
  - name: extServiceCallsExtPixieDns
    version: 1
    origins:
      - OpenTelemetry
    conditions:
      - attribute: eventType
        anyOf: [ "MetricRaw" ]
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

The `name` property provides information during debugging and can be used for feature flags or logging purposes.

The `origins` contains a list of keys indicating where the telemetry information originates from in a user-friendly way.

The `conditions` section specifies the attributes and matching criteria that determine if the rule applies to a given data point.

The `relationship` section defines various aspects of the relationship, such as its expiration timeframe, the relationship type, 
and how to extract the source and target GUIDs.

All these sections are required for a rule to be considered valid.

## Version

The `version` field indicates the rule version. This allows for introducing new breaking changes to the formats 
without requiring immediate updates to all engines. 
The engine discards any unsupported versions.

## Origin

The `origin` field represents a closed list of values that indicate the source of telemetry. When defining a rule, a list of these values must be provided.

Example:

```yaml
- origin:
    - APM Metrics
    - Open Telemetry
    - Prometheus
```

The full list of supported origins (as of July 2023) is the following:

| **Origin source**      | **Description**                                                   |
|------------------------|-------------------------------------------------------------------|
| APM Metrics            | Uses data generated by the New Relic APM agent(s).                |
| Infrastructure Agent   | Uses data generated by the New Relic Infrastructure Agent(s).     |
| Metric API             | Uses data generated by New Relic metrics product.                 |
| Distributed Tracing    | Uses data generated by the New Relic Distributed Tracing product. |
| AIOPS                  | Uses data generated by the New Relic AIOPS product.               |
| AWS Integration        | Uses data generated by the New Relic AWS Integration.             |
| GCP Integration        | Uses data generated by the New Relic GCP Integration.             |
| Azure Integration      | Uses data generated by the New Relic Azure Integration.           |
| Kubernetes Integration | Uses data generated by the New Relic Kubernetes Integration.      |
| Pixie                  | Uses data generated by the New Relic Pixie Integration.           |
| Prometheus             | Uses data generated by the New Relic Prometheus Integration.      |
| OpenTelemetry          | Uses data generated by the New Relic OpenTelemetry Integration.   |
| OnHost Integration     | Uses data generated by the New Relic OnHost Integration.          |

One rule can be applied to multiple sources, as shown in the example. These origins are used by our internal services 
to filter which rules to evaluate and which ones to ignore. 
The mapping of origins to sources allows for performance improvements when evaluating rules via the matching system.

## Conditions

`Conditions` are used to determine if a rule should be applied to a given data point. 
The proposal for `conditions` is an iterative improvement over the existing rules format to allow for 
future changes without major breaking updates.

The following example demonstrates various capabilities supported by conditions:

```yaml
conditions:
  - attribute: eventType
    anyOf: ["NginxSample", "K8sPodSample", "K8sContainerSample"]
  - attribute: host.guid
    present: yes
  - attribute: metricName
    startsWith: "DurationByCaller/"
    caseSensitive: true
  - attribute: metricName
    regex: ".*\.rds\.amazonaws\.com.*"
```

The `attribute` field specifies the name of the attribute in the data point, and the operation to perform is defined using matchers 
such as `anyOf`, `present`, `startsWith`, and `regex`. 
Only one matcher should be present in each condition, and matching is case-insensitive by default unless 
specified otherwise with `caseSensitive: true`. 
Multiple conditions must all match for the rule to apply; there is no support for `OR` conditions.

## Relationship

The `relationship` section defines aspects related to the relationship we want to synthesize.

### Expires

The `expires` field allows configuring the duration for which the relationship should exist if it is not reported within that timeframe. 
By default, this field is set to ***75 minutes*** (the default for the relationship platform). 
The value for expires follows the `ISO-8601` format and must be between ***10 minutes*** and ***72 hours*** (inclusive), which is the time interval 
currently supported by the platform.

Explicitly providing the expires field is recommended for clarity, even though the default is 75 minutes.

### RelationshipType

The `relationshipType` field specifies the type of relationship to create. Only predefined values from the 
supported relationship types list are accepted.

#### Source & Target Resolvers

Resolvers define how the source and target GUIDs are determined. There are three types of resolvers:

1. `extractGuid`: Extracts the GUID from an existing attribute in the telemetry.
2. `buildGuid`: Constructs the GUID using various pieces of information from the telemetry.
3. `lookupGuid`: Performs a lookup using candidates to find the matching GUID based on telemetry attributes. 

##### extractGuid

The `extractGuid` resolver is the simplest and allows specifying an attribute to use as the GUID.

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

If the resolved GUID corresponds to an `INFRA-NA` GUID, the relationship platform needs to know the actual type behind the GUID. 
This can be achieved by providing a second field that specifies a hardcoded value for the entity type 
or retrieves it from an existing attribute.

##### buildGuid

The `buildGuid` resolver allows constructing the GUID from different pieces of information.

Example:

```yaml
source:
  buildGuid:
    account:
      attribute: accountId
      # or lookup: yes
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

The `account` field can be defined using an attribute in the telemetry or by specifying a lookup key. 
When a lookup key is defined, it will be searched within the accounts of the trusted account for the current data point (proposal system).

The domain and type fields can be either hardcoded values or attributes. The type field also allows setting the given value as the type in the 
GUID using `valueInGuid`, which is useful for building `INFRA-NA` GUIDs.

The `identifier` can be constructed using one or multiple fragments. Each fragment can be a hardcoded string, an attribute, or a part of an attribute. 
The identifier can be hashed using one of the supported hashing algorithms, with farmHash being the currently supported algorithm.

If needed, a part of an attribute can be provided as a capture group in a regular expression.

##### lookupGuid
The `lookupGuid` resolver is used when the GUID cannot be inferred from the telemetry and a lookup is required using candidates.

Example:

```yaml
lookupGuid:
  candidateCategory: DATABASE
  fields:
    - field: endpoint
      attribute: aws.db.host
```

The `lookupGuid` points to the candidate category to be used and maps the fields required for the lookup to the attributes in the telemetry.