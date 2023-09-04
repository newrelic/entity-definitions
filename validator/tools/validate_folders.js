const { DEFINITIONS_DIR, DEFINITION_FILE_NAME } = require('./props');
const { readdir } = require('fs').promises;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { FILE_ENCODING } = require('./props');

(async () => {
  const folderDefinitions = await readdir(DEFINITIONS_DIR, { withFileTypes: true });
  for (const folderDefinition of folderDefinitions) {
    const definitionPath = path.resolve(DEFINITIONS_DIR, folderDefinition.name, DEFINITION_FILE_NAME);
    if (!fs.existsSync(definitionPath)) {
      console.error(`expected ${DEFINITION_FILE_NAME} in the definitions folder ${folderDefinition.name}`);
      process.exit(1);
    }
    const { domain, type } = yaml.load(fs.readFileSync(definitionPath, FILE_ENCODING));
    const folderDefinitionExpectedName = `${domain.toLowerCase()}-${type.toLowerCase()}`;
    if (folderDefinition.name !== folderDefinitionExpectedName) {
      console.error(`bad definition folder for ${domain} ${type}... expected ${folderDefinitionExpectedName}`);
      process.exit(1);
    }
  }
})();
