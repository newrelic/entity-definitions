const utils = require('./utils');
const githubHelper = require('./ghHelper');

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
