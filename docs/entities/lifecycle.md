# Entity Lifecycle


Entities in New Relic have a different lifecycle based on their entity types. 

The key configuration that determines how long an entity lives is the `entityExpirationTime` setting in the `definition.yml` file, under the `configuration` section. 
This setting controls how long the record of an entity will persist in New Relic after it stops reporting data.

For example, let's consider an entity type called `PIHOLE` in the `EXT` domain. By default, this entity is stored for `eight days` after it stops reporting. 
You can modify this value to suit your specific needs.

```
domain: EXT
type: PIHOLE

configuration:
  entityExpirationTime: EIGHT_DAYS
```

The full list of valid values for `entityExpirationTime` are:

* `EIGHT_DAYS`: Eight days expiration, suitable for long-lived entities like services (e.g. `EXT-SERVICE`).
* `FOUR_HOURS`: Four hours expiration, suitable for short-lived entities like containers (e.g. `INFRA-CONTAINER`).
* `DAILY`: Entities are stored for 24 hours after they stop reporting.
* `QUARTERLY`: Entities are stored for three months after they stop reporting. 
This setting is only for special cases, where we want to still be able to check data about an entity long after it expired (e.g. `MOBILE-APPLICATION`).
* `MANUAL`: This setting is exclusive to entities without a [synthesis section][synthesis], meaning they are manually created and deleted, such as Dashboards (`VIZ-DASHBOARD`) or Workloads (`NR1-WORKLOAD`).

Please note that the entity expiration time solely impacts the record of the entity itself and not the associated telemetry data. 
Telemetry data will remain accessible in NRDB and via NRQL, following its data retention settings, regardless of the entity expiration time. 
However, once an entity has expired, it won't be accessible through the APM view, Search, or other New Relic experiences. 
Additionally, we currently do not support time-travel queries to inspect data related to expired entities.

## Alertable

Furthermore, entities are, by default, `alertable`, meaning you can attach alerts to them. To modify this behavior, add the `alertable` attribute to the entity definition, as shown below:

```
domain: EXT
type: PIHOLE

configuration:
  alertable: false
```

If `alertable` is set to `true`, the entity's metadata includes the field `alertSeverity`, which is updated when the telemetry associated to this entity breaks an alerting condition.
Conversely, setting alertable to false causes the entity to no longer appear in the Explorer, while still being visible in the Search.

Feel free to customize these settings based on your specific use case and requirements to manage entities effectively within New Relic.

[synthesis]: synthesis.md
