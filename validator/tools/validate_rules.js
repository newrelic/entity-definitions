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
    // If both are empty they are the same
    if(condition1.length === 0 || condition2.length === 0){
        return true
    }

    // If there are different amount of conditions they can't be the same.
    if (condition1.length != condition2.length) {
        return false
    }

    // Sort so we can compare them ordered
    sorted1 = condition1.sort()
    sorted2 = condition2.sort()

    sameConditions = sorted1.filter((e1cond, index) => isEqual(e1cond, sorted2[index]))

    // All of the conditions are equal
    return sameConditions.length == sorted1.length
}

function validateAndRecord(definition, identifier, compositeIdentifier, conditions) {
    let key = identifier || buildKey(compositeIdentifier)

    if ((
            ENTITY.has(key) &&
            hasConflictingConditions(ENTITY.get(key), conditions) &&
            hasDifferentDomainType(ENTITY.get(key), definition)
        ))
    {
        let conflictingType = ENTITY.get(key)

        throw `The rule with identifier ${key} from ${definition.domain}-${definition.type} has same definition than a rule in ${conflictingType.domain}-${conflictingType.type}.`
    }

    ENTITY.set(key, definition)
}

function buildKey(compositeIdentifier) {
    return compositeIdentifier.attributes.join(compositeIdentifier.separator)
}

const RULES = [
    {
        name: 'Entities with the same identifier and conditions must have the same domain and type',
        apply: def => {
            if(def.hasOwnProperty("synthesis")) {
                if(def.synthesis.rules !== undefined){
                    def.synthesis.rules.forEach( (rule) =>{
                        const identifier = rule.identifier
                        const compositeIdentifier = rule.compositeIdentifier
                        const conditions = rule.conditions || []

                        validateAndRecord(def, identifier, compositeIdentifier, conditions);
                    })
                } else{
                    const identifier = def.synthesis.identifier
                    const compositeIdentifier = def.synthesis.compositeIdentifier
                    const conditions = def.synthesis.conditions || []

                    validateAndRecord(def, identifier, compositeIdentifier, conditions);
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
            }))
    .catch(err => console.log(err))
    }
)
