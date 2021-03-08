[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# Entity Synthesis Definitions 

The definition files contained in this repository are mappings between the telemetry attributes NewRelic ingests, and the entities users can interact with. If you have telemetry from any source that is not supported out of the box, you can propose a mapping for it and upon a successful merge of your PR, any telemetry received by NewRelic and that matches your definition file will be synthesized into an entity. Then you can start leveraging any of the tools built around them such as the entity explorer, high-density views, workloads, etc.

## Guidelines 

Please verify that the definition you want to merge meets the acceptance criteria outlined below 
and if this is your first time creating a definition file please get in contact with the team by opening an issue. 
We can clear any doubts you might have and provide guidance about the best way to proceed, 
so your PR will get merged faster, and you can start enjoying your shiny new entities. 


### Acceptance criteria for new entity definitions

- Each entity definition file must live inside its own folder and both must follow the filename format explained below. 
- The definition MUST be a valid YAML file.
- The definition must contain at least the top-level fields `domain` and `type`, along with the fields `name`, `identifier` and `conditions`, located under `synthesis`. 
The synthesis section is optional only if you can ensure that the telemetry is being stamped with the entity GUID and tags based on rules defined internally at NewRelic.
- We use the `domain`, `type` and `identifier` to assign each entity a Global Unique Identifier (GUID).
- The `domain` must be a value matching `/[A-Z][A-Z0-9_]{2,14}/`. This field is mostly relevant internally for NR. 
Use EXT by default, although we may advise to use a different value in some cases.                
- The `type` must be a value matching `/[A-Z][A-Z0-9_]{2,49}/`. This field is meant to identify the type of entity. 
Some examples are APPLICATION, HOST or CONTAINER.  
- The `identifier` must be assigned a parameter that is unique within the domain and type (e.g
. cluster ID, host ID, etc). Keep in mind that the value has the following restrictions and that the
 entity will not be synthesized if the value extracted from the metrics is considered invalid:
  - `/[\x20-\x7E]{1,50}/`.
  - 1 to 36 standard ascii characters, excluding control chars (codes: 32-126).
  - If you suspect that your identifiers may not fulfil our length requirements, set the optional `encodeIdentifierInGUID` field to true. 
- You must also define a condition to match on the value of an attribute. An entity will be synthesized if it matches the provided condition and contains the attributes set for the identifier and name. 
  For more information on our supported conditions please refer to the [conditions](#conditions) section. 
- The definition needs to provide enough information to differentiate this entity from others. It cannot be a subset nor a superset of any existing definition. 
- If you are creating a definition for a `domain` and `type` that already exists we'll need to
 understand your use case, so please provide an explanation in your PR or get in touch with us to discuss it. 
- If you are adding composite metrics' files for an entity definition they must be placed inside the same folder and follow the filename format.

### Filename format

Each entity definition needs to be placed inside a folder named like this:

`<DOMAIN>-<TYPE>` for example: `infra-etcd_cluster `

Inside each folder there must be *at least* an entity definition file named `definition.yml`.

Composite metrics must be defined in their own YAML file and referenced from the entity definition file. 
They must be placed inside the same folder as the entity definition and must be named according to their type:

- Golden metrics: `golden_metrics.yml`
- Summary metrics: `summary_metrics.yml `

### Schema definition

When creating a new entity definition you may use the following files as a guide:

- Entity definition: [entity definition example](./docs/example-entity-definition.yml)
- Golden metrics definition: [golden metrics definition example](./docs/example-entity-golden_metrics.yml)
- Summary metrics definition: [summary metrics definition example](./docs/example-entity-summary_metrics.yml)

For more concrete examples, you can take a look at the files located on the [definitions](./definitions) folder. 

#### Conditions

We support the following conditions over telemetry attributes and their values:

- Attribute match: If the specified attribute is present on the telemetry, synthesize the entity. The value of the attribute is not taken into account. 

```yaml
  conditions:
    # The attribute must be present on the telemetry
    - attribute: attributeName
```
- Value match: If the value of the specified telemetry attribute matches the expected one, synthesize the entity.

```yaml
  conditions:
    # The attribute’s value must match the provided value
    - attribute: attributeName
      value: value
```
- Value prefix match: If the value of the specified telemetry attribute has the expected prefix, synthesize the entity.

```yaml
  conditions:
    # The attribute’s value must have the expected prefix
    - attribute: attributeName
      prefix: val
```

#### Tags

The `tags` field accepts an array of metric's attributes that can be used to generate tags for the entities of the defined DOMAIN and TYPE.
During synthesis, the tags will be created using the attribute name as key and its value as the tag value. 

If some of the tags' attributes are not present on the telemetry message received, the entity will still be synthesized with the available tags (if any).

By default an entity tag will contain all the values seen for this attribute in the telemetry.
If you want to override all the values with the new one you can configure `multiValue: false` for that specific tag.

```yaml
  tags:
    attributeNameB:
      multiValue: false
    attributeNameC:
```

An example of this is `INFRA-CONTAINER` where the tag `container.state` will always display the last state (`running`, `stopped`, etc..) instead of a list of all the states the entity has gone through.


#### Golden tags

The `goldenTags` field accepts an array of tag-keys which are considered the most important for the entity's DOMAIN and TYPE, 
so that they can be highlighted in the different NewRelic visualizations as important metadata for the entity. 

The `goldenTags` may be a subset of those defined in the `tags` field, but they can also be added to the entity after synthesis, 
so we trust the criteria of the contributor of the definition to select the tags they need as the domain expert. 

#### Composite metrics

Composite metrics are those deemed important by you and used by NewRelic to provide an out-of-the-box experience with your entities. There are two types of composite metrics that can be defined:

- Summary metrics: Data related to entities that describes how certain parameters are behaving based on the available telemetry. Some examples of good summary metrics are an aggregated form of Throughput, CPU usage and Memory usage to be shown in, for example, a Table. See the [summary metrics](docs/summary_metrics.md) documentation to know more.  
- Golden metrics: These are metrics that are deemed the most important for the given entity and are used, for example, in its 'overview' page. See the [golden metrics](docs/golden_metrics.md) documentation to know more.  

#### Dashboard templates

You can create a dashboard with the NewRelic interface and export it to JSON format:

![Export Dashboard](./docs/images/export_dashboard.png)

Then you can just copy it to a file within your entity type's folder, modify it if needed and refer to it from the definition.yml:

```yaml
dashboardTemplates: 
 - ./<dashboardName>.json
```

Note that you can define more than one dashboard under the `dashboardTemplates` field. 

#### Configurations

In the `configuration` section of the `definition.yml` file you can tweak the entity's behavior. 
At the moment we accept two optional configuration parameters `entityExpirationTime` and `alertable`.

```yaml
configuration:
  # The amount of time without receiving telemetry before an entity is deleted. Defaults to EIGHT_DAYS
  entityExpirationTime: EIGHT_DAYS
  # Defines whether the entities of this type should have an alert severity associated, defaults to true
  alertable: true
```

**entityExpirationTime**

By default, entities are automatically deleted if we reach 8 days without receiving any telemetry from them. 
If this doesn't suit your needs you may set the `entityExpirationTime` to one of the following values:  

- `DAILY`
- `EIGHT_DAYS` (default)
- `QUARTERLY`
- `MANUAL` (allowed only for entities without a `synthesis` section)


**alertable**

If `alertable` is set to true (default), the entity's metadata will include a field `alertSeverity` that is updated when the telemetry associated to this entity breaks an alerting condition.



## Testing and validation

Some validations are automatically executed whenever there is a contribution via pull request, to verify that the provided definition meets the basic requirements:

* The definition files are not malformed, incorrect or missing mandatory fields. 
* The *identifier* cannot be extracted from an attribute with the same name for two different Domain-Types, unless conditions are set to differentiate them, so that the conditions from one entity are not a superset of the other. 

You can read more about the current validations [here](/validator/README.md).

## Support

If the information provided in the repository is not enough to solve your doubts, you can get in contact with the team by opening an issue. 

**Other Support Channels**

* [New Relic Documentation](https://docs.newrelic.com): Comprehensive guidance for using our platform
* [New Relic Community](https://discuss.newrelic.com): The best place to engage in troubleshooting questions
* [New Relic Developer](https://developer.newrelic.com/): Resources for building a custom observability applications
* [New Relic University](https://learn.newrelic.com/): A range of online training for New Relic users of every level
* [New Relic Technical Support](https://support.newrelic.com/) 24/7/365 ticketed support. Read more about our [Technical Support Offerings](https://docs.newrelic.com/docs/licenses/license-information/general-usage-licenses/support-plan).

## Contributing
We encourage you to add new entity types! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](../../security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic)

## License
Entity Synthesis Definitions is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
