const process = require('process')
const utils = require('./utils')
const isEqual = require('is-equal');

var ENTITY

function hasDifferentDomainType(entity1, entity2){
    return (entity1.domain !== entity2.domain || entity1.type !== entity2.type)
}

function hasConflictingConditions(entity1, entity2){
    let e1conditions = entity1.synthesis.conditions || []
    let e2conditions = entity2.synthesis.conditions || []

    if(e1conditions.length === 0 || e2conditions.length === 0){
        return true
    }

    // Conditions from one entity are present in the other
    return e1conditions.some(e1cond => e2conditions.some(e2cond => isEqual(e1cond, e2cond)));
}

const RULES = [
    {
        name: 'Entities with the same identifier and conditions must have the same domain and type',
        apply: def => {
            if(def.synthesis != undefined) {
                const identifier = def.synthesis.identifier

                if (ENTITY.has(identifier) && hasConflictingConditions(ENTITY.get(identifier), def) && hasDifferentDomainType(ENTITY.get(identifier), def)) {
                    throw `Same entity ID criteria ${identifier} and condition assigned to different domain types.`
                }

                ENTITY.set(identifier, def)
            }
        }
    }
]

RULES.forEach(rule => {
    ENTITY = new Map()
    utils.getAllDefinitions().then(
        definitions => definitions.forEach(definition => {
                    try {
                        rule.apply(definition)
                    } catch (errorMessage) {
                        console.error(`Definition for ${definition.domain}-${definition.type} violates rule "${rule.name}":`)
                        console.error(errorMessage)
                        // terminate early
                        process.exit(1)
                    }
            console.log(`=> processed ${definition.domain}-${definition.type}... valid for rule "${rule.name}"`)
            }))
    .catch(err => console.log(err))
    }
)
