const { RELATIONSHIPS_CANDIDATES_DIR, FILE_ENCODING } = require('./props');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Attribute keys are matched case-insensitively, so listing the same key more than once
 * with a different casing is redundant. Returns the groups of redundant keys.
 */
function findRedundantKeys (attributeKeys) {
  const byLowerCase = new Map();
  attributeKeys.forEach(key => {
    const lower = key.toLowerCase();
    byLowerCase.set(lower, [...(byLowerCase.get(lower) || []), key]);
  });
  return [...byLowerCase.values()].filter(keys => keys.length > 1);
}

function validateCandidate (candidate) {
  const errors = [];
  (candidate.lookups || []).forEach((lookup, lookupIndex) => {
    ((lookup.attributes || {}).predicates || []).forEach(predicate => {
      findRedundantKeys(predicate.attributeKeys || []).forEach(keys => {
        errors.push(`lookup #${lookupIndex + 1} (field "${predicate.field}") repeats the attribute key ${JSON.stringify(keys)}; attribute keys are case-insensitive, keep only one`);
      });
    });
  });
  return errors;
}

async function main () {
  let failed = false;
  const files = (await fs.readdir(RELATIONSHIPS_CANDIDATES_DIR)).filter(file => file.endsWith('.yml'));
  for (const file of files) {
    const candidate = yaml.load(await fs.readFile(path.resolve(RELATIONSHIPS_CANDIDATES_DIR, file), FILE_ENCODING));
    validateCandidate(candidate).forEach(error => {
      console.error(`${file}: ${error}`);
      failed = true;
    });
  }
  if (failed) process.exit(1);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { findRedundantKeys, validateCandidate };
