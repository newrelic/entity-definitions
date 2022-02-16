# Synthesis rules

Synthesis is the process of creating entities from telemetry. Given some rules, we try to match them against all the telemetry in order to create entities and create tags for them. 

Synthesis rules should be defined in the `definition.yaml` file, under a `synthesis.rules` section. A rule's requirement defines the telemetry attribute that provides the `identifier`, and the attribute that will be used as the `name` of the entity.

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
| encodeIdentifierInGUID | Boolean | No | If true, the identifier value will be encoded to respect the [GUID limits][guid_spec]. Defaults to `false`. |
| conditions | List | No | The list of conditions to apply in the data point to match the rule. Defaults to an empty list. |
| tags     | List   | No | The list of attributes to copy as entity tags if the rule matches. Defaults to an empty list. |

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