const utils = require('./utils')
const isEqual = require('is-equal');

let ALL_RELATIONSHIP_SYNTHESIS

function validateAndRecord(rule) {
    if (ALL_RELATIONSHIP_SYNTHESIS.has(rule.name)) {
        throw `There already exists a rule with name ` + rule.name
    }
    ALL_RELATIONSHIP_SYNTHESIS.set(rule.name, rule)
}

function twoLookupResolvers(rule) {
    if (rule.relationship.source != null &&
        rule.relationship.target != null &&
        rule.relationship.source.hasOwnProperty("lookupGuid") &&
        rule.relationship.target.hasOwnProperty("lookupGuid") ) {
            throw rule.name + `: we don't allow two lookup resolvers`
    }
}

function exactlyOneResolver(rule){
    function checkTwoResolvers(input, name, field){
        cont = 0
        if (input.hasOwnProperty("lookupGuid")) cont +=1
        if (input.hasOwnProperty("extractGuid")) cont +=1
        if (input.hasOwnProperty("buildGuid")) cont +=1
        if (cont >1) throw name + `: only one resolver is allowed per ` + field
    }
    if (rule.relationship.source == null)
        throw rule.name + " should have one resolver in the relationship source"
    else
        checkTwoResolvers(rule.relationship.source, rule.name, "source")
    if (rule.relationship.target == null)
        throw rule.name + " should have one resolver in the relationship target"
    else
        checkTwoResolvers(rule.relationship.target, rule.name, "target")
}

const RULES = [
    {
        name: 'Relationship Synthesis rules should have a unique name',
        apply: rule => validateAndRecord(rule)
    },
    {
        name: 'Relationship Synthesis rules cannot have 2 lookup resolvers',
        apply: rule => twoLookupResolvers(rule)
    },
    {
        name: 'Relationship Synthesis should have exactly one resolver per source/target',
        apply: rule => exactlyOneResolver(rule)
    }
]

RULES.forEach(rule => {
    ALL_RELATIONSHIP_SYNTHESIS = new Map()
    utils.getAllRelationshipSynthesisDefinitions().then(
        allRelationships => allRelationships.forEach(setOfDefinitionsInFile => {
            setOfDefinitionsInFile.relationships.forEach(relationship => {
                try {
                    rule.apply(relationship)
                } catch (errorMessage) {
                    console.error(`Definition for ${relationship.name} violates rule "${rule.name}":`)
                    console.error(errorMessage)
                    // terminate early
                    process.exit(1)
                }
            })
        }))
    .catch(err => console.log(err))
    }
)