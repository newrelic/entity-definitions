# Guid Spec

A GUID is a unique identifier for an entity.

It's a [URL-safe Base64 encoded](https://tools.ietf.org/html/rfc3548#page-6) [No padding](https://tools.ietf.org/html/rfc7515#appendix-C) (`=`) value composed of 4 segments delimited by a pipe (`|`).

The GUID: `MXxBUE18QVBQTElDQVRJT058MjM` decodes into `1|APM|APPLICATION|23`


| Segment | Purpose | Scope | Format |
| ---- | ---- | ---- | ---- |
| Account ID | Source account for the entity | Unique in all New Relic | Numeric `/\d{1,10}/` |
| Domain | Domain of entity | Unique in all New Relic | Upper-case Alphanumeric (SCREAMING_SNAKE_CASE) `/[A-Z][A-Z0-9_]{2,14}/` |
| Type | Type of the entity | Unique to the domain | Upper-case Alphanumeric (SCREAMING_SNAKE_CASE) `/[A-Z][A-Z0-9_]{2,49}/` |
| Identifier | Value used to identify the entity within its domain's data model | Unique to Account ID, Domain and Type | A string with ascii chars 32-126 `/[\x20-\x7E]{1,50}/` |

## Account ID

The `account_id` field MUST be a globally unique.
Identifies the account to which the entity reports its data.

## Domain

The domain of the Entity GUID is the authoritative source for the
identity of the entity.

The domain could be a product, such as `MOBILE` or `INFRA`, or a more
general category, such as `CLOUD`.

We recommend to use `EXT` unless you have a requirement to use a specific domain.

## Type

The type of the entity MUST be a string that is globally unique within its domain.
The type SHOULD be human-friendly since it will be exposed in several API's.

Be sure to propose a type that explains what the entity concept is.

Good examples are: `HOST`, `CONTAINER`, `APPLICATION`, `DASHBOARD`.

## Identifier

The identifier is the domain-specific id for the entity. It MUST
be unique within its domain, type and account.

Identifiers SHOULD be chosen from raw, unmodified attributes present in
telemetry reported by the relevant entity, rather than generated
by internal systems.

## Additional guidelines

- If a third-party identifier is used as an identifier, that identifier
  should be documented by the third party as a primary and invariant
  identifying value of the entity.
- If the identifier is based on multiple values, these values:
    - Must only consist of values required to uniquely identify the
      entity within its domain
    - Must not include metadata, superfluous to identifying the entity
    - Must be used consistently to generate the identifier
