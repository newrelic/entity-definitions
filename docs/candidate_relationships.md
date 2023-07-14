# [Experimental] Candidate Relationships

Candidate Relationships are a mechanism used to give hints about what relationships should be created by relationship synthesis. 
They are used to create complex relationships between entities within and across different product verticals in the context of an Observability offering.

These relationships refer to the connections between entities within and across different product verticals. 
In the context of our Observability offering, these relationships enable customers to more quickly identify issues, 
resolve incidents, and correlate data across our distinct product offerings. 
However, the current capabilities for creating relationships have limitations, 
particularly when dealing with entities where only vague data is known.

A clear example of such limitations is seen in relating AWS RDS databases. 
To establish these relationships, data needs to be joined from the Infrastructure agent, 
which connects to AWS and retrieves information about the provisioned databases, and the New Relic agent, 
which identifies the applications connected to databases using their connection URIs. 
With this combined data, relationships can be created, including the association between an APM application and a database. 
The APM agent may detect the database URL but lacks information about the entity GUID or whether the database is instrumented by New Relic. 
By leveraging the data from both agents, these candidate relationships can be established, 
enabling a more comprehensive understanding of the interconnected entities and improving users' overall Observability capabilities.

* TODO: Insert image graph here

The [relationship synthesis](relationship_synthesis.md) pipeline will, in turn, join together the data provided by the candidate relationships 
with the rules defined by the relationship synthesis rules and generate new relationships out of this data.

# How to create a new Candidate Relationship
