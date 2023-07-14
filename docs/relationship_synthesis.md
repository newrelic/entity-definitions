# [Experimental] Relationship Synthesis

Relationship synthesis rules are a set of rules defined in this repository, that are used in the process of relationship synthesis. 

Relationship synthesis is a mechanism that leverages the defined rules to match telemetry datapoints and correlate them 
with candidate relationships and entities data. Its purpose is to automatically identify and create relationships on the users behalf users.

When the relationship synthesis process identifies a match between telemetry datapoints and the defined rules, 
it generates what is known as instrumented relationships. 
These instrumented relationships are the actual relationships that are created based on the established criteria.

In some cases, a candidate relationship may be provided, but it may not be possible to find a direct match 
with the existing relationship synthesis rules. 
In such situations, an uninstrumented relationship can be optionally created. 
These uninstrumented relationships serve as a way to expose the potential relationship opportunities 
that may exist but are not yet fully supported by the defined rules.

Overall, relationship synthesis rules play a crucial role in automating the identification and creation of 
relationships between entities by providing a set of guidelines and conditions 
to correlate telemetry data and candidate relationships.

# How to create a new Relationship Synthesis rule 
