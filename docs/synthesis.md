# Synthesis rules

Synthesis is the process of creating entities from telemetry. Given some rules, we try to match them against all the telemetry in order to create entities and create tags for them. 

Synthesis rules should be defined in the `definition.yaml` file, under a `synthesis.rules` section.

A rule should define an `identifier` that will be a unique value for that domainType in one user account.
It should also provide the attribute that defines the `name` of the entity.

These two attributes **must be always present** on the telemetry in order to create an entity.

```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
```

| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| name    | String | Yes | The attribute to use for the entity name. |
| identifier| String| Yes | Telemetry attribute to use as the entity identifier.|
| compositeIdentifier| String| No | Set of attributes that will identify the telemetry. When this one is used identifier is not required.|
| encodeIdentifierInGUID | Boolean | No | If true, the identifier value will be encoded to respect the [GUID limits][guid_spec]. Defaults to `false`. |
| conditions | List | No | The list of conditions to apply in the data point to match the rule. Defaults to an empty list. |
| tags     | List   | No | The list of attributes to copy as entity tags if the rule matches. Defaults to an empty list. |

### Identifier

As previously mentioned the identifier should be a unique value for that entityType in a specific user account.

For example if a service identifier is the `serviceName` attribute, multiple applications reporting the same value under the same account will be treated as only one entity.

The identifier is the most important piece of information of an entity since changing it means creating a new entity and hence not having the previous produced telemetry linked to the new entity.

#### Composite identifier

The general advice is to use only one attribute as the identifier but there are some situations where only one attribute is not enough to uniquely identify the entity.

In these cases `compositeIdentifier` can be used to define multiple attributes as the identifier, and a separator between each attribute.

```yaml
synthesis:
  rules:
  - compositeIdentifier:
      separator: "/"
      attributes:
        - k8s.namespace
        - k8s.deployment
```

If we take as an example the following data point

```json
{
  "k8s.namespace": "team-one",
  "k8s.deployment": "my-service"
}
```

The `identifier` will be: `team-one/my-service`, notice the `/` is the `separator` property on the definition.
Since this could easly reach the limits of this field we advise to always use `encodeIdentifierInGUID: true` so the identifier is hashed into a number within the limits.


There are a few drawbacks when using composite identifiers:

- These attributes **must exist** in all the telemetry that needs to be associated with the entity.
- The entity will **not be indexed** if one of these attributes don't exist.
- When generating relationships, if the GUID of the entity is not present the attributes **must exist** to generate a relationship with another entity.

Keep these caevats in mind when considering using composite identifiers.


### Conditions

You can define extra conditions that must match in order to produce an entity:

- Attribute must exist
```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    conditions:
    - attribute: aws.az
      present: true
```

- Attribute must not exist
```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    conditions:
    - attribute: container.id
      present: false
```


- Attribute must have value
```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    conditions:
    - attribute: aws.az
      value: "us-west-1"
```

- Attribute must start with
```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    conditions:
    - prefix: us-
```

| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| attribute | String  | Yes | The name of the attribute to match in the data point. |
| value    | String   | No | The exact value the attribute must contain in order to match the data point. Can't be mixed with `prefix` or `present`.  |
| prefix | String | No | The attribute must start with this value. Can't be mixed with `value` or `present`. |
| present | Boolean | No | When `true` the attribute must be present, when `false` attribute must not exist in the data point. Defaults to true when no other condition is given. Can't be mixed with `value` or `prefix`.  |

### Tags

You can also define a set of attributes that can be copied into entity tags. These attributes will only be copied after a datapoint matches a rule.

```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    tags:
      aws.az:
```

If the attribute `aws.az` is present in the data point that matched the rule, its value will be copied to an entity's tag named `aws.az`.

- One value per tag

By default, an entity tag is a list of values: Any new tag will be added to the list. 

There are a few cases where you want the new value to actually replace the old ones. For example, a Kubernetes POD has a `k8s.status` tag that defines the last status of the pod. Having a list of values like `[running, stopped, restarting]` doesn't provide any value, but having the last state allows us to filter by all the `restarting` pods. In those cases you can use `multiValue: false` to ensure only the last value is kept. 

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: k8s.podName
      tags:
        k8s.status:
          multiValue: false
```

- Rename tags

You can also change the name of the tag to another value, rather than using the name in the attribute. In general, we suggest not to use this configuration unless you are trying to use more standard namings, since sometimes it's difficult for the user to see the difference between entity tags and telemetry attributes, and changing the names could cause even more confusion.

A good use case for this feature is `CONTAINER`: A container has different sources (docker, kubernetes, etc.), and we rename the tags to use a standard naming instead of a "per source" name.

```yaml
synthesis:
  rules:
  - identifier: entity.id
    name: docker.name
    tags:
      docker.state:
        entityTagName: container.state
  - identifier: entity.id
    name: k8s.containerName
    tags:
      k8s.status:
        entityTagName: container.state
```

| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| multiValue | Boolean  | No | If set to `false`, any update will replace all existing values in the tag, making it a tag with only one value. Defaults to `true`. |
| entityTagName | String | No | If provided, the attribute value will be copied into a tag with this name. Defaults to the attribute name. |

#### Default tags

The following set of tags is always added to an entity:

- `account`
- `accountId`
- `trustedAccountId`

Also, if present in the telemetry, these attributes are also added to the entity tags:

- `instrumentation.name`
- `instrumentation.provider`

[guid_spec]: guid_spec.md

#### Prefixed tags

Every attribute name including any of the provided prefixes will get indexed as a tag, taking into account the following:
* If there are multiple attributes matching against the same prefix, all of them will get indexed.
* The prefix gets removed from the final tag name.
* Prefixed attributes take the lower precedence, meaning that after removing the prefix, if there's already a tag with the same name coming from the same telemetry datapoint, it will be discarded.
* The prefix "tags." doesn't get specified as part of this structure, it still works independently and also takes a higher precedence over these prefixes. 

> With a `label.` prefix as part of the `prefixedTags` list, and the telemetry containing any attribute prefixed with it,
for instance, `label.name`, the final tag name will be `name`.

Finally, notice the `prefixedTags` structure is not a nested child hanging from `tags`, but directly from `rules`.

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: k8s.podName
      prefixedTags:
        example.:
        example2_:
```

### Legacy features

This section is only relevant if you are configuring synthesis rules for an existing entity type.
If you are creating a brand new entity type none of these features will be allowed.

These features are defined under the rule using the `legacyFeatures` key.
```
    legacyFeatures:
      overrideGuidType: true
```

| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| overrideGuidType | Boolean  | No | If set to `true`, it will replace the entityType in the guid for the `NA` value. Defaults to `false`. |