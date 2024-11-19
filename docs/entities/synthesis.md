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
| encodeIdentifierInGUID | Boolean | No | If true, the identifier value will be hashed to respect the [GUID limits][guid_spec]. Defaults to `false`. |
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

You can also define a set of attributes that can be copied into entity tags.

These are global tags, and they are applied differently depending on the rule structure:
1. There is only a unique rule living under ```synthesis```.
2. There are multiple rules living under ```rules```.

Notice these global tag definitions live under ```synthesis```.
```yaml
synthesis:
  tags:
    aws.az:
```

If the attribute `aws.az` is present in the data point that matched any rule, its value will be copied to an entity's tag named `aws.az`.

If there is only a unique rule living under ```synthesis```, those are its tags.

But if there are multiple rules living under ```rules```, some specific tags for each rule can be defined. Notice that these attributes will only 
be copied after a datapoint matches a rule, and they take priority over the global tags, meaning **if the same tag is defined on both structures**, 
the rule specific tag overrides the global tag.

These specific tag definitions live under ```rules``` for every rule.
```yaml
synthesis:
  rules:
  - identifier: entity.id
    name: k8s.containerName
    tags:
      k8s.status:
```

If the attribute `k8s.status` is present in the data point that matched this specific rule, its value will be copied to an entity's tag named `k8s.status`.

#### One value per tag

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

#### Rename tags

You can also change the name of the tag to another value, rather than using the name in the attribute. In general, we suggest not to use this configuration unless you are trying to use more standard namings, since sometimes it's difficult for the user to see the difference between entity tags and telemetry attributes, and changing the names could cause even more confusion.

This is the relevant syntax:
```yaml
synthesis:
  rules:
  - identifier: someIdAttribute
    name: someNameAttribute
    tags:
      originalAttributeName:
        entityTagNames: [desiredTagName1, desiredTagName2]
```
The above example will result in an entity having two tags, `desiredTagName1` and `desiredTagName2`, with the value present in the `originalAttributeName` attribute from the processed data point.

A good use case for this feature is `CONTAINER`: A container has different sources (docker, kubernetes, etc.), and we rename the tags to use a standard naming and a "per source" name.

```yaml
synthesis:
  rules:
  - identifier: entity.id
    name: docker.name
    tags:
      docker.state:
        entityTagNames: [container.state, docker.state]
  - identifier: entity.id
    name: k8s.containerName
    tags:
      k8s.status:
        entityTagNames: [container.state, k8s.status]
```

#### TTL tags

By default, unique `key:value` tuples for tags are stored on the entity object indefinitely. You can override this behavior using the `ttl` configuration option.

For example, given this configuration:

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: device_name
      tags:
        environment:
        owner_group:
```

The tag named `environment` will maintain all received values in a list by default. In other words, if this tag value was `production` and then later changed to `testing` the entity UI the tags component would show 2 unique tuples. Additionally, if we stop using the `owner_group` tag, its tuple would also by default be kept on the entity object indefinitely:

```
environment: production
environment: testing
owner_group: devops
```

Updating the configuration to add a 4 hour TTL on each tag key like this:

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: device_name
      tags:
        environment:
          ttl: P4H
        owner_group:
          ttl: P4H
```

Would result in the original `environment: production` value being purged after 4 hours of telemetry on this entity, where this tuple is absent. In addition, the lack of telemetry using the tag key `owner_group` would also capture that any tuples using this key are absent, and thus expired.

The final result for the entity UI is a tags component with only the unique tuple that is currently being sent with this entity's telemetry.

```
environment: testing
```


| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| multiValue | Boolean  | No | If set to `false`, any update will replace all existing values in the tag, making it a tag with only one value. Defaults to `true`. |
| entityTagNames | List<String> | No | If provided, the attribute value will be copied into a tag using each value of the list as the key. Defaults to list with the attribute name. |
| ttl | String | No | If provided, the tag will be removed if it's not reported again on the given period of time, the period is defined in [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601#Durations). |

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

Similar to the tag configuration, the `prefixedTags` option allows you to synthesize tags from entity telemetry attributes that match the defined prefix.

For example, given telemetry that follows this basic pattern:

```json
{
  "common" : {
    "timestamp": 1531414060739,
    "interval.ms": 10000,
    "attributes": {
      "device_name": "foo",
      "org.name": "bar",
      "org.environment": "production",
      "org.owner_group": "devops"
    }
  },
  "metrics": [
    {
      "name": "service.errors.all",
      "type": "count",
      "value": 9
    }
  ]
}
```

A configuration like this will ensure all attributes with the `org.` prefix are indexed as tags:

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: device_name
      prefixedTags:
        org.:
```

Resulting in these tag tuples:

```
name: bar
environment: production
owning_team: devops
```

##### Default rules

Every attribute name including any of the provided prefixes will get indexed as a tag, taking into account the following:
* There is no explicit tag rule that matches the attribute's name including the prefix. 
* If there are multiple attributes matching against the same prefix, all of them will get indexed.
* The prefix gets removed from the final tag name.
  * _Note that the `org.name` attribute above is indexed as `name`_
* The prefix `tags.` will always index tags and doesn't need to be specified as part of this structure. However, it's possible to override its default configuration by including the prefix here.



| **Name** | **Type** | **Required** | **Description**  |
| -------- | -------- | ------------ | ---------------- |
| ttl | String | No | If provided, the tag will be removed if it's not reported again on the given period of time, the period is defined in [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601#Durations). |

Finally, notice the `prefixedTags` structure is not a nested child hanging from `tags`, but directly from `rules`.

```yaml
synthesis:
  rules:
    - identifier: entity.id
      name: k8s.podName
      prefixedTags:
        example.:
        example2_:
          ttl: P1D
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
