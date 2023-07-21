# Golden Tags

Golden Tags are the most important tags an entity displays, they're used to show a quick preview of the entity.

While we allow up to 20 tags, we recommend to use no more than 10.

## Defining golden tags

Golden tags are defined in the `definition.yaml` file, under `goldenTags`. Entities that don't have defined tags will simply not show them.

```yaml
domain: APM
type: APPLICATION
goldenTags:
- language
- Environment
- Team
- Project
```

We recommend unifying tags to have a common structure between sources of data.

If multiple sources bring different tags, you can specify all of them, but only tags which exist for that specific entity will be displayed.

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