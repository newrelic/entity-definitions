# Candidate Relationships

Candidate Relationships are a mechanism used to give hints about what relationships should be created by relationship synthesis. 
They are used to create complex relationships between entities within and across different product verticals in the context of an Observability offering.

These relationships refer to the connections between entities within and across different product verticals. 
In the context of our Observability offering, these relationships enable customers to more quickly identify issues, 
resolve incidents, and correlate data across our distinct product offerings. 
However, the current capabilities for creating relationships have limitations, 
particularly when dealing with entities where only vague data is known.

A clear example of such limitations is seen in relating AWS RDS databases. 
To establish these relationships, data needs to be joined from the Infrastructure agent, 
which connects to AWS and retrieves information about the provisioned databases, and the New Relic agent, 
which identifies the applications connected to databases using their connection URIs. 
With this combined data, relationships can be created, including the association between an APM application and a database. 
The APM agent may detect the database URL but lacks information about the entity GUID or whether the database is instrumented by New Relic. 
By leveraging the data from both agents, these candidate relationships can be established, 
enabling a more comprehensive understanding of the interconnected entities and improving users' overall Observability capabilities.

The [relationship synthesis](relationship_synthesis.md) pipeline will, in turn, join together the data provided by the candidate relationships 
with the rules defined by the relationship synthesis rules and generate new relationships out of this data.

# How to create a new Candidate Relationship

To create a new candidate relationship, follow these steps:

1. Create a `<candidate-type>.yml` file under the `relationships/candidates` directory.
2. Using the current definition of `AWSSQSQUEUE` as an example, the `candidate-type` should match the
filename (`AWSSQSQUEUE.yml`) and the category, which is `AWSSQSQUEUE`.

Example:

```yaml
category: AWSSQSQUEUE
```

3. Define one or more `lookups` for the candidate. Each lookup specifies the `entityTypes` related to the category.

Example:

```yaml
category: AWSSQSQUEUE
lookups:
  - entityTypes:
    onMatch:
    onMiss:
```

4. Fill in the required fields for each lookup. For the AWSSQSQUEUE example, the fields are `entityTypes`, `tags`, `onMatch` and `onMiss`.

Example:

```yaml
category: AWSSQSQUEUE
lookups:
  - entityTypes:
      - domain: INFRA
        type: AWSSQSQUEUE
    tags:
      matchingMode: ALL
      predicates:
        - tagKeys: ["aws.sqs.QueueName"]
          field: queueName
        - tagKeys: ["aws.region"]
          field: region
    onMatch:
      onMultipleMatches: RELATE_ALL
    onMiss:
      action: CREATE_UNINSTRUMENTED
      uninstrumented:
        type: AWSSQSQUEUE
```

The [next section](#how-to-configure-a-new-candidate-relationship) provides detailed explanations of the configurable elements for a candidate relationship definition.

5. Create a new pull request and make sure all the automatic validations are successfully executed.

6. Wait for our team to review the pull request and iterate on the feedbacks.

7. Once it is approved, merged to the main branch and a new release is issued, it is available to you.

8. Enjoy your new candidate relationship! :tada:

# How to configure a new Candidate Relationship

The following table lists the available fields for configuring a new candidate relationship and specifies if they are mandatory or not.

| **Name** | **Type** | **Required** | **Description**                                                     |
|----------|----------|-------------|---------------------------------------------------------------------|
| category | String   | Yes         | Represents the generic concept of the entity category.              |
| lookups  | List     | Yes         | Provides a list of rules for the defined category.                  |
| tags     | Composed | Yes         | Specifies which of the entity tag keys must match the input fields. |
| onMatch  | Composed | Yes         | Specifies actions to be executed in case the rule finds a match.    |
| onMiss   | Composed | Yes         | Specifies actions to be executed in case the rule finds a miss.     |

## Category

The category represents the generic concept of the entity. It is usually more generic than the `entityType`, 
as it can encompass multiple types. Think of it as a generic interface.

The category is also used as the uninstrumented type when creating a new entity.

## Lookups

Lookups define the rules for the category. Each lookup specifies the entityTypes related to the category.
During the lookup process, only the specified entityTypes will be inspected.

## Tags

Tags define which entity tag keys must match the input fields. It is possible to define different matching modes.

The `tags` field is a composed object with the following subfields:

| **Name**   | **Type** | **Required** | **Description**                                                         |
|------------|----------|-------------|--------------------------------------------------------------------------|
| mode       | String   | Yes         | Defines the matching behavior for the specified tags.                    |
| predicates | Composed | Yes         | Defines the `tagKeys` from the entities to match with the `field` value. |

### (Tags) Mode

* ***ANY***: All entities that match at least one of the defined `predicates` will be considered for a relationship.
* ***ALL***: Entities must match all the specified `predicates` to be considered for a relationship.
* ***FIRST***: The first group of entities that match the top-most `predicate` will be considered for a relationship.

Example:
```yaml
    tags:
      matchingMode: ALL
      predicates:
        - tagKeys: ["aws.sqs.QueueName"]
          field: queueName
        - tagKeys: ["aws.region"]
          field: region
```

## onMatch

The `onMatch` section controls the behavior after matching entities. The `onMultipleMatches` field specifies how to handle multiple matches:

* ***ALL***: Relates the known GUID with all the matched entities.
* ***ONLY_ONE***: Relates the known GUID with a single entity, discarding additional matches.

Example:
```yaml
    onMatch:
     onMultipleMatches: RELATE_ALL
```

## onMiss

If the system fails to match with any entity, an uninstrumented entity will be created.

The uninstrumented entity indicates that additional instrumentation can be configured to gain more visibility.

There are two options for handling `onMiss`:

* **DISCARD**: Discards misses instead of generating an uninstrumented entity.
* **CREATE_UNINSTRUMENTED**: Generates an uninstrumented entity.
When using `CREATE_UNINSTRUMENTED`, you need to provide the type used for the created entities.

Example:
```yaml
    onMiss:
      action: CREATE_UNINSTRUMENTED
      uninstrumented:
        type: AWSSQSQUEUE
```