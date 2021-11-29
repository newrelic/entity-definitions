# Entity Lifecycle

By default an entity will be kept stored for eight days after it stopped reporting.

This value can be configured for each entity type under the `definition.yml` file in the `configuration` section.

```
domain: EXT
type: PIHOLE

configuration:
  entityExpirationTime: EIGHT_DAYS
```

Other valid values are `FOUR_HOURS`, `DAILY` , `QUARTERLY` and `MANUAL`

`MANUAL` is only allowed for entity types that don't have a [synthesis section][synthesis].
This is used on entities that are only created via direct action of a user, these could be `DASHBOARDS` or `WORKLOADS` for example.

We also only allow `FOUR_HOURS` for entities that have a very short life span, `CONTAINERS` is a good example of those.

## Alertable

The other option of an entity is to decide if alerts can be attached to it or not.

By default an entity will always be alertable unless told otherwise.

```
domain: EXT
type: PIHOLE

configuration:
  alertable: false
```

If `alertable` is set to `true`, the entity's metadata will include a field `alertSeverity` that's updated when the telemetry associated to this entity breaks an alerting condition.

<!--
TODO: ADd an image of health using alertSeverity here?
-->

[synthesis]: synthesis.md