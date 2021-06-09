# Relationship Synthesis

Relationships are a connecting edge between a source entity node and a target entity node. Each relationship connection is assigned a label type in an attempt to better define the relationship type of the connection. For example an APM application X which performs an http request to APM application Y is said as source X CALLS target Y i.e X CALLS Y

We can synthesise relationships between two existing entities based on the rules provided in this repository. 

* Declare a relationships.yml file with rules in the directory of the entity type where your telemetry will be originating from. 

[Relationship definition example](./example-relationship-definition.yml)

We will analyse the telemetry associated with the registered rules and synthesise a relationship based on this. Relationships will continue to exist until analysed telemetry stops reporting. Then the relationship will timeout after approximately 75 minutes.

As of this moment, we can only synthesise a relationship if the telemetry to be analysed contains all the correct information to synthesise both source and target entities. 


### Supported Relationship Types

| **Relationship Type** | **Description** | 
| -------- | ---------------------------------------------             |
| CALLS | Normally reserved for HTTP operations between two entities |
| CONTAINS | source kubernetes cluster contains target pod | 
| HOSTS | assigned from a source host entity that hosts a given target entity |
| IS | if two entities are in fact the same entity we can link them as such |
| SERVES | The source server entity that serves a target entity. Normally reserved for serving front-end entities |


