const { DEFINITIONS_DIR, DEFINITION_FILE_NAME, DEFINITION_FILE_NAME_STG } = require('./props');
const { readdir } = require('fs').promises;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { FILE_ENCODING } = require('./props');

const checkStagingOnlyFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkStagingOnlyFiles(fullPath);
    } else if (!entry.name.includes('.stg.')) {
      console.error(`Found non-staging file in staging-only definition: ${fullPath}`);
      process.exit(1);
    }
  }
};

(async () => {
  const folderDefinitions = await readdir(DEFINITIONS_DIR, { withFileTypes: true });
  for (const folderDefinition of folderDefinitions) {
    let definitionPath = path.resolve(DEFINITIONS_DIR, folderDefinition.name, DEFINITION_FILE_NAME_STG);
    const stgOverrideExists = fs.existsSync(definitionPath);
    definitionPath = path.resolve(DEFINITIONS_DIR, folderDefinition.name, DEFINITION_FILE_NAME);
    const definitionExists = fs.existsSync(definitionPath);

    if (!definitionExists && !stgOverrideExists) {
      console.error(`expected ${DEFINITION_FILE_NAME} in the definitions folder ${folderDefinition.name}`);
      process.exit(1);
    }

    if (!definitionExists && stgOverrideExists) {
      // If only staging override exists, ensure no prod files are present
      checkStagingOnlyFiles(path.resolve(DEFINITIONS_DIR, folderDefinition.name));
      definitionPath = path.resolve(DEFINITIONS_DIR, folderDefinition.name, DEFINITION_FILE_NAME_STG);
    }

    const { domain, type } = yaml.load(fs.readFileSync(definitionPath, FILE_ENCODING));
    const folderDefinitionExpectedName = `${domain.toLowerCase()}-${type.toLowerCase()}`;
    if (folderDefinition.name !== folderDefinitionExpectedName) {
      console.error(`bad definition folder for ${domain} ${type}... expected ${folderDefinitionExpectedName}`);
      process.exit(1);
    }
  }
})();
