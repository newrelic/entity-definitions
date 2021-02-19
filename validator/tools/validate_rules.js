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
                "INFRA-RABBITMQNODE",

                // Types with special implementations.
                "APM-APPLICATION",
                "BROWSER-APPLICATION",
                "EXT-SERVICE",
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
