const utils = require('./utils')
const isEqual = require('is-equal');

let ENTITY

function hasDifferentDomainType(entity1, entity2){
    return (entity1.domain !== entity2.domain || entity1.type !== entity2.type)
}

// Conditions from one entity are present in those provided
function hasConflictingConditions(previousEntity, conditions){
    let conflict = false;
    if(previousEntity.synthesis.rules !== undefined){
        previousEntity.synthesis.rules.forEach((rule)=>{
            let previousConditions = rule.conditions || []
            conflict = conflict || areSameConditions(previousConditions, conditions)
        })

    } else{
        let previousConditions = previousEntity.synthesis.conditions || []
        conflict = areSameConditions(previousConditions, conditions)
    }

    return conflict;
}

function areSameConditions(condition1, condition2){
    if(condition1.length === 0 || condition2.length === 0){
        return true
    }
    return condition1.some(e1cond => condition2.some(e2cond => isEqual(e1cond, e2cond)));
}

function validateAndRecord(definition, identifier, conditions) {
    if (ENTITY.has(identifier) && hasConflictingConditions(ENTITY.get(identifier), conditions) && hasDifferentDomainType(ENTITY.get(identifier), definition)) {
        throw `Same entity ID criteria ${identifier} and condition assigned to different domain types.`
    }

    ENTITY.set(identifier, definition)
}

const RULES = [
    {
        name: 'Entities with the same identifier and conditions must have the same domain and type',
        apply: def => {
            if(def.hasOwnProperty("synthesis")) {
                if(def.synthesis.rules !== undefined){
                    def.synthesis.rules.forEach( (rule) =>{
                        const identifier = rule.identifier
                        const conditions = rule.conditions || []

                        validateAndRecord(def, identifier, conditions);
                    })
                } else{
                    const identifier = def.synthesis.identifier
                    const conditions = def.synthesis.conditions || []

                    validateAndRecord(def, identifier, conditions);
                }
            }
        }
    },
    {
        name: 'Summary metrics for this type are not allowed',
        apply: def => {
            const notAllowed = [
                // Types with not exposed functionality.
                "INFRA-AZUREVIRTUALNETWORKSPUBLICIPADDRESS",
                "INFRA-COUCHBASENODE",
                "INFRA-F5NODE",
                "INFRA-F5POOL",
                "INFRA-F5POOLMEMEBER",
                "INFRA-F5VIRTUALSERVER",
                "INFRA-KUBERNETESCLUSTER",

                // Types with special implementations.
                "APM-APPLICATION",
                "BROWSER-APPLICATION",
                "INFRA-AWSLAMBDAFUNCTION",
                "NR1-WORKLOADS",
                "PROTO-ENGGROUP",
                "PROTO-TEAM",
                "SYNTH-MONITOR",
                "SYNTH-SECURED",
                "VIZ-DASHBOARD",
            ]


            const domainType = def.domain + "-" + def.type
            const hasSummaryMetrics = 'compositeMetrics' in def && 'summaryMetrics' in def['compositeMetrics']

            if (notAllowed.includes(domainType) && hasSummaryMetrics) {
                throw `We don't allow custom summary metrics for ${domainType}. Please open an issue if you want to change this type.`
            }
        }
    },
    {
        name: 'Golden metrics & tags for this type are not allowed',
        apply: def => {
            const notAllowed = [
                // Types with not exposed functionality.
                "INFRA-KUBERNETESCLUSTER",
            ]


            const domainType = def.domain + "-" + def.type
            const hasGoldenMetrics = 'compositeMetrics' in def && 'goldenMetrics' in def['compositeMetrics']
            const hasGoldenTags = typeof def['goldenTags'] !== 'undefined'

            if (notAllowed.includes(domainType) && (hasGoldenMetrics || hasGoldenTags)) {
                throw `We don't allow custom golden metrics & tags for ${domainType}. Please open an issue if you want to change this type.`
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
