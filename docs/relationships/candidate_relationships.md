# Candidate Relationships

Candidate Relationships serve as a valuable mechanism for creating complex connections between entities within 
and across different product verticals in the context of our Observability offering.

These relationships play a crucial role in enabling customers to quickly identify issues, resolve incidents, 
and correlate data across our various product offerings. 
While our current capabilities for creating relationships are powerful, they have some limitations, 
especially when dealing with entities where only limited data is available and the entity GUID cannot be determined 
directly from a single telemetry datapoint.

An illustrative example of these limitations is evident when relating AWS RDS databases. 
Establishing these relationships requires joining data from the Infrastructure agent, which connects to AWS and retrieves information about provisioned databases, 
with data from the New Relic agent, which identifies applications connected to databases using their connection URIs. 
By combining data from both agents, candidate relationships are formed, including the association between an APM application and a database. 

In the [relationship synthesis](relationship_synthesis.md), the candidate is combined with the relationship synthesis rules. 
This integration significantly enhances the Observability experience for our users, offering a more comprehensive understanding of the interconnected entities.

In the next section, we explain the steps needed to define a new Candidate Relationship.

# How to create a new Candidate Relationship

To create a new candidate relationship, follow these steps:

1. Create a `<candidate-type>.yml` file under the `relationships/candidates` directory.
   1. In this directory, you'll find all existing candidates, so it's also an excellent source of inspiration for crafting new ones.
2. Using the current definition of `AWSS3BUCKET` as an example, the `candidate-type` should match the
filename (`AWSS3BUCKET.yml`) and the category, which is `AWSS3BUCKET`.
   1. A recommended practice is to use the entity type as the candidate type where possible.

Example:

```yaml
category: AWSS3BUCKET
```

3. Define one or more `lookups` for the candidate. 
   1. These are rules that specify the `entityTypes` related to the `category`. 
   They allow you to target entities of specific types during the lookup process. 
   2. For instance, if you have an entity type called `INFRA-HOST`, and you define a lookup for it, 
   the relationship synthesis process will inspect only entities of type `INFRA-HOST` to find potential matches for the candidate relationship. 
   This focused approach enhances the precision and efficiency of the relationship synthesis.

Example:

```yaml
category: AWSS3BUCKET
lookups:
  - entityTypes:
    tags:
    onMatch:
    onMiss:
```

4. Fill in the required fields for each lookup. For the `AWSS3BUCKET` example, the fields are `entityTypes`, `tags`, `onMatch` and `onMiss`.

Example:

```yaml
category: AWSS3BUCKET
lookups:
   - entityTypes:
        - domain: INFRA
          type: AWSS3BUCKET
     tags:
        matchingMode: ANY
        predicates:
           - tagKeys: ["aws.bucketName", "aws.s3.BucketName"]
             field: bucketName
     onMatch:
        onMultipleMatches: RELATE_ALL
     onMiss:
        action: CREATE_UNINSTRUMENTED
        uninstrumented:
           type: AWSS3BUCKET
```

The [next section](#how-to-configure-a-new-candidate-relationship) provides detailed explanations of the configurable elements for a candidate relationship definition.

5. Create a new pull request and make sure all the automatic validations are successfully executed.

6. Wait for our team to review the pull request and iterate on the feedback.

7. Once approved, merged to the main branch and a new release is issued, it is available for you to use.

8. Ensure you also have a matching [relationship synthesis rule](relationship_synthesis.md) that [utilizes](relationship_synthesis.md#lookupguid) the provided candidate.

9. Enjoy your new candidate relationship! :tada:

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

Lookups define the rules for the category and specify the entity types related to it. 
These rules are used during the lookup process to inspect only entities on the specified entity types, 
allowing for a targeted search for a specific entity type.

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
        matchingMode: ANY
        predicates:
           - tagKeys: ["aws.bucketName", "aws.s3.BucketName"]
             field: bucketName
```

In this case, entities with the tag keys `aws.bucketName` or `aws.s3.BucketName` will be matched (using their tag values) 
with data from the `bucketName` field.

## onMatch

The `onMatch` section controls the behavior after matching entities. The `onMultipleMatches` field specifies how to handle multiple matches:

* ***RELATE_ALL***: Relates the known GUID with all the matched entities.
* ***DISCARD_ALL***: Assumes a conflict and discards all matches.

Example:
```yaml
    onMatch:
     onMultipleMatches: RELATE_ALL
```

## onMiss

If the system fails to match with any entity, an uninstrumented entity could be created.

The uninstrumented entity indicates that additional instrumentation can be configured to gain more visibility.

There are two options for handling `onMiss`:

* **NO_OP**: Discards misses instead of generating an uninstrumented entity.
* **CREATE_UNINSTRUMENTED**: Generates an uninstrumented entity.
When using `CREATE_UNINSTRUMENTED`, you need to provide the type used for the created entities.

Example:
```yaml
    onMiss:
      action: CREATE_UNINSTRUMENTED
      uninstrumented:
        type: AWSS3BUCKET # The final domain-type will be UNINSTRUMENTED-AWSS3BUCKET
```
