const { RELATIONSHIPS_CANDIDATES_DIR, DEFINITIONS_DIR, DEFINITION_FILE_NAME, FILE_ENCODING } = require('./props');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const CREATE_UNINSTRUMENTED_DEF = 'CREATE_UNINSTRUMENTED';
const UNINSTRUMENTED_DEF = 'UNINSTRUMENTED';

async function checkUninstrumentedDefExists (type) {
  const defPath = path.resolve(DEFINITIONS_DIR, `${UNINSTRUMENTED_DEF}-${type}`.toLowerCase(), DEFINITION_FILE_NAME);
  return await fs.access(defPath, fs.constants.F_OK | fs.constants.W_OK)
    .then(() => true)
    .catch(() => false);
}

(async () => {
  const relationshipsCandidates = await fs.readdir(RELATIONSHIPS_CANDIDATES_DIR, { withFileTypes: true });
  for (const relationshipCandidate of relationshipsCandidates) {
    const definitionPath = path.resolve(RELATIONSHIPS_CANDIDATES_DIR, relationshipCandidate.name);
    const object = yaml.load(await fs.readFile(definitionPath, FILE_ENCODING));
    for (const lookup of object.lookups) {
      if (Object.hasOwn(lookup, 'onMiss') && lookup.onMiss.action === CREATE_UNINSTRUMENTED_DEF) {
        const type = lookup.onMiss.uninstrumented.type;
        if (!await checkUninstrumentedDefExists(type)) {
          console.error(`Expected ${UNINSTRUMENTED_DEF} definition for ${type} in the Entity Definitions folder`);
          process.exit(1);
        }
      }
    }
  }
})();
