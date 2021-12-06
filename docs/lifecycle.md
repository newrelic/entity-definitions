# Entity Lifecycle

An entity is stored during **eight days** after it has stopped reporting. You can configure this value for each entity type in the `definition.yml` file, in the `configuration` section.

```
domain: EXT
type: PIHOLE

configuration:
  entityExpirationTime: EIGHT_DAYS
```

Other valid values are `FOUR_HOURS`, `DAILY`, `QUARTERLY`, and `MANUAL`.

* `MANUAL` is only allowed for entity types that don't have a [synthesis section][synthesis]. These entities are created only via direct action of a user, such as `DASHBOARDS` or `WORKLOADS`.
* `FOUR_HOURS` is only allowed for entities that have a very short life span, such as `CONTAINERS`.

## Alertable

Another option is to attach alerts to an entity. An entity is `alertable` by default. 

```
domain: EXT
type: PIHOLE

configuration:
  alertable: false
```

If `alertable` is set to `true`, the entity's metadata includes the field `alertSeverity`, which is updated when the telemetry associated to this entity breaks an alerting condition.

<!--
TODO: ADd an image of health using alertSeverity here?
-->

[synthesis]: synthesis.md