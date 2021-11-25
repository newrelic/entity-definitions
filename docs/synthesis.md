# Syntehsis rules

Synthesis is the process of creating entities from telemetry. Given some rules we try to match them against all the telemetry in order to create entities and create tags for them.

Synthesis rules should be defined in the `definition.yaml` file under a `synthesis.rules` section.

The requirement for a rule is to define the telemetry attribute that provides the `identifier` of the entity and the attribute that will be used as the `name`.

```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
```

| **Name** | **Type** | **Description**  |
| -------- | -------- | ---------------- |
| name    | String | Required. The attribute to use for the entity name |
| identifier| String| Required. Telemetry attribute to use as the entity identifier.|
| encodeIdentifierInGUID | Boolean | Defaults to `false`. If true the identifier value will be encoded to respect the [GUID limits][guid_spec] |
| conditions | List | Defaults to empty list. The list of conditions to apply in the data point to match the rule |
| tags     | List   | Defaults to empty list. The list of attributes to copy as entity tags if the rule matches |

### Conditions

You can define extra conditions that must match in order to produce an entity.

- Attribute must exist
```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
  	conditions:
    - attribute: aws.az
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


| **Name** | **Type** | **Description**  |
| -------- | -------- | ---------------- |
| attribute | String  | Required. The name of the attribute to match in the data point. If only this field is defined the attribute must exist in the data point |
| value    | String   | Optional. Can't be mixed with `prefix`. The exact value the attribute must contain in order to match the data point. |
| prefix | String | Optional. Can't be mixed with `value`. The attribute must start with this value. |


### Tags

After a rule matches you can also define a set of attributes that can be copied into entity tags.

```yaml
synthesis:
  rules:
  - identifier: hostname
    name: hostname
    tags:
	  aws.az:
```

If the attribute `aws.az` is present in the data point that matched the rule it's value will be copied into a tag named `aws.az` into the entity.

By default an entity tag is a list of values and any new tag will be added to the list.
There are a few cases where you want the new value to actually replace the old ones,
for example a Kubernetes POD has a `k8s.status` tag that defines the last status of the pod.

Having a list of values like `[running, stopped, restarting]` doesn't provide any value. But having the last state allows us to filter by all the `restarting` pods.

In those cases you can use `multiValue: false` to ensure only the last value is kept. 

```yaml
synthesis:
  rules:
    - identifier: entity.id
  name: k8s.podName
  tags:
    k8s.status:
      multiValue: false
```

You can also change the name of the tag to use another value rather than the name in the attribute.
In general we suggest to not use this configuration unless you are trying to use more standard namings,
the reason is that sometimes for the user is difficult to see the difference between entity tags and telemetry attributes and chaning the names could cause even more confussion.

A good use case for this feature is `CONTAINER`, we have different sources for a container (docker, kubernetes, etc) and we rename the tags to use a standard naming instead of per source naming.

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

| **Name** | **Type** | **Description**  |
| -------- | -------- | ---------------- |
| multiValue | Boolean  | Defaults to `true`. If set to `false` any update will produce a replace of all existing values into the tag. Making it efectively a tag with only one value |
| entityTagName | String | Defaults to the attribute name. If provided the attribute value will be copied into a tag with this name |


#### Default tags

There's a set of tags that will be always added to an entity, these are:

- `account`
- `accountId`
- `trustedAccountId`

Also, if present in the telemetry these attributes will always be added into the entity tags:

- `instrumentation.name`
- `instrumentation.provider`

[guid_spec]: guid_spec.md