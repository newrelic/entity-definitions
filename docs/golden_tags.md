# Golden Tags

Golden Tags are the most important tags of an entity to display.

These are used when the user is seeing a quick preview of the entity.

We recommend no more than 10 tags but 20 is the maximum to display.

## Defining golden tags

Golden tags are defined under the `definition.yaml` file under `goldenTags`

```yaml
domain: APM
type: APPLICATION
goldenTags:
- language
- Environment
- Team
- Project
```

Entities that don't have the defined tags will simply not show them.

We recommend unifying tags to have a common structure between sources of data.
If you have a case where multiple sources bring different tags, you can specify all of them, only the tags existing for that specific entity will be displayed.

```yaml 
goldenTags:
- account
- linuxDistribution
- aws.awsRegion
- azure.regionName
- gcp.zone
- cloud.region
```

<!--
TODO: INFRA-HOST image here showing the aws tag
-->