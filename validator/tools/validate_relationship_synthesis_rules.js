const utils = require('./utils');
const githubHelper = require('./ghHelper');
const durationParser = require('tinyduration');

const secondInMillis = 1000n;
const minutesInMillis = 60n * secondInMillis;
const hoursInMillis = 60n * minutesInMillis;
const daysInMillis = 24n * hoursInMillis;
const weeksInMillis = 7n * daysInMillis;
const monthsInMillis = 30n * daysInMillis;
const yearsInMillis = 365n * daysInMillis;

const minRelationshipTtl = 10n * minutesInMillis; // 10 minutes
const maxRelationshipTtl = 72n * hoursInMillis; // 72 hours

/**
 * Allowed conditions per origin
 * If origin is empty or null, it will skip validation
 * NOTE: regexes can be used
 */
const VALID_CONDITIONS = new Map([
  ['APM Metrics', ['metricName', /metricName__.*/]],
  ['Infrastructure Agent', []],
  ['Kubernetes Integration', []],
  ['AWS Integration', []],
  ['GCP Integration', []],
  ['Azure Integration', []],
  ['OnHost Integration', []],
  ['OpenTelemetry', []],
  ['Pixie', []],
  ['Prometheus', []],
  ['Distributed Tracing', []],
  ['Metric API', []],
  ['Event API', []],
  ['AIOPS', []],
  ['Browser Monitoring', []],
  ['Mobile Monitoring', []]
]);

let ALL_RELATIONSHIP_SYNTHESIS;
function validateAndRecord (rule) {
  if (ALL_RELATIONSHIP_SYNTHESIS.has(rule.name)) {
    throw new Error('There already exists a rule with name ' + rule.name);
  }
  ALL_RELATIONSHIP_SYNTHESIS.set(rule.name, rule);
}

function twoLookupResolvers (rule) {
  if (rule.relationship.source !== null &&
        rule.relationship.target !== null &&
        'lookupGuid' in rule.relationship.source &&
        'lookupGuid' in rule.relationship.target) {
    throw new Error(rule.name + ': we don\'t allow two lookup resolvers');
  }
}

function exactlyOneResolver (rule) {
  function checkTwoResolvers (input, name, field) {
    let cont = 0;
    if ('lookupGuid' in input) cont += 1;
    if ('extractGuid' in input) cont += 1;
    if ('buildGuid' in input) cont += 1;
    if (cont > 1) throw new Error(name + ': only one resolver is allowed per ' + field);
  }
  if (rule.relationship.source == null) { throw new Error(rule.name + ' should have one resolver in the relationship source'); } else { checkTwoResolvers(rule.relationship.source, rule.name, 'source'); }
  if (rule.relationship.target == null) { throw new Error(rule.name + ' should have one resolver in the relationship target'); } else { checkTwoResolvers(rule.relationship.target, rule.name, 'target'); }
}

function conditionsMatchOrigins (rule) {
  const validConditions = [];
  const validConditionsRegexes = [];

  for (const origin of rule.origins) {
    const originValidConditions = VALID_CONDITIONS.get(origin);

    if (!originValidConditions || originValidConditions.length === 0) {
      return;
    }

    originValidConditions.forEach((condition) => {
      if (condition instanceof RegExp) {
        validConditionsRegexes.push(condition);
      } else {
        validConditions.push(condition);
      }
    });
  }

  rule.conditions.forEach((condition) => {
    if (!validConditions.includes(condition.attribute) && !validConditionsRegexes.some(regex => regex.test(condition.attribute))) {
      throw new Error(rule.name + ' conditions must be valid for given origins, but found ' + condition.attribute);
    }
  });
}

function toMillis (duration) {
  // Uses BigInt to avoid overflow for large durations that could trick the validation
  return BigInt(duration.years || 0) * yearsInMillis +
      BigInt(duration.months || 0) * monthsInMillis +
      BigInt(duration.weeks || 0) * weeksInMillis +
      BigInt(duration.days || 0) * daysInMillis +
      BigInt(duration.hours || 0) * hoursInMillis +
      BigInt(duration.minutes || 0) * minutesInMillis +
      BigInt(duration.seconds || 0) * secondInMillis;
}

function relationshipExpiryValidation (rule) {
  let expiry;

  try {
    expiry = durationParser.parse(rule.relationship.expires);
  } catch (e) {
    console.log(e);
    throw new Error(rule.name + ': invalid relationship synthesis rule expires format');
  }

  const expiryMillis = toMillis(expiry);
  if (expiryMillis < minRelationshipTtl || expiryMillis > maxRelationshipTtl) {
    throw new Error(rule.name + `: relationship synthesis rule expires must be between ${minRelationshipTtl} (10min) and ${maxRelationshipTtl} (72h) milliseconds`);
  }
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
  },
  {
    name: 'Relationship Synthesis conditions must ve valid for given origins',
    apply: rule => conditionsMatchOrigins(rule)
  },
  {
    name: 'Relationship Synthesis expiry must be valid ISO-8601 between 10 minutes and 72 hours',
    apply: rule => relationshipExpiryValidation(rule)
  }
];

(async () => {
  ALL_RELATIONSHIP_SYNTHESIS = new Map();
  const allRelationships = await utils.getAllRelationshipSynthesisDefinitions();
  allRelationships.forEach(setDefinitionsInFile => {
    setDefinitionsInFile.relationships.forEach(relationship => {
      RULES.forEach(rule => {
        try {
          rule.apply(relationship);
        } catch (errorMessage) {
          const message = `Definition for ${relationship.name} violates rule "${rule.name}":`;
          console.error(message);
          console.error(errorMessage);
          githubHelper.createReviewPR(`${message}\n${errorMessage}`, githubHelper.GH_PR_EVENT_REQUEST_CHANGES)
            .then(process.exit(1))
            .catch(error => console.error(error));
        }
      });
    });
  });
})().catch(error => {
  console.error(error);
  process.exit(1);
});
