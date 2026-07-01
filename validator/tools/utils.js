const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const githubHelper = require('./ghHelper');
const { readdir } = fs.promises;
const { DEFINITIONS_DIR, DEFINITION_FILE_NAME, DEFINITION_FILE_NAME_STG} = require('./props');
const { RELATIONSHIPS_SYNTHESIS_DIR } = require('./props');
const allowedFileNamesRegex = /^[A-Z0-9_]+(?:-[A-Z0-9_]+)?-to-[A-Z0-9_]+(?:-[A-Z0-9_]+)?(\.stg)?\.yml$/;
const regex = new RegExp(allowedFileNamesRegex);

async function getFiles (dir) {
  const items = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(items.map((item) => {
    const res = path.resolve(dir, item.name);
    return item.isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

module.exports = {
  async getAllRelationshipSynthesisDefinitions () {
    const files = await getFiles(RELATIONSHIPS_SYNTHESIS_DIR);
    const definitionFiles = files.filter(file => file.includes('.yml'));
    return await Promise.all(definitionFiles.map(async (filename) => {
      const justFileName = filename.split('/').pop();
      if (regex.test(justFileName)) { return yaml.load(fs.readFileSync(filename, 'utf8')); } else {
        const message = `Incorrect filename. Format must be ORIGIN-to-TARGET: ${justFileName}`;
        await githubHelper.createReviewPR(message, githubHelper.GH_PR_EVENT_REQUEST_CHANGES);
        throw message;
      }
    }));
  },

  // Returns relationship synthesis definitions partitioned into the file sets
  // that load in each environment, mirroring the override mechanic described
  // in README.md ("`.stg` file will replace original in STG while original
  // will be used for PRODUCTION"):
  //   - prod:    every non-.stg.yml file
  //   - staging: for each base name, the .stg.yml override if present,
  //              otherwise the .yml; plus any .stg.yml that has no .yml peer
  // Each entry is `{ filePath, definitions }` so callers can attribute
  // validation errors to the originating file.
  async getRelationshipSynthesisDefinitionsByEnvironment () {
    const STG_SUFFIX = '.stg.yml';
    const PROD_SUFFIX = '.yml';

    const files = (await getFiles(RELATIONSHIPS_SYNTHESIS_DIR))
      .filter(file => file.endsWith(PROD_SUFFIX));

    for (const filename of files) {
      const justFileName = filename.split('/').pop();
      if (!regex.test(justFileName)) {
        const message = `Incorrect filename. Format must be ORIGIN-to-TARGET: ${justFileName}`;
        await githubHelper.createReviewPR(message, githubHelper.GH_PR_EVENT_REQUEST_CHANGES);
        throw message;
      }
    }

    const prodFiles = new Map(); // baseName -> path
    const stgOverrides = new Map(); // baseName -> path
    for (const f of files) {
      const justFileName = f.split('/').pop();
      if (justFileName.endsWith(STG_SUFFIX)) {
        stgOverrides.set(justFileName.slice(0, -STG_SUFFIX.length), f);
      } else {
        prodFiles.set(justFileName.slice(0, -PROD_SUFFIX.length), f);
      }
    }

    const prodEnvPaths = [...prodFiles.values()];
    const stagingEnvPaths = [];
    for (const [baseName, prodPath] of prodFiles) {
      stagingEnvPaths.push(stgOverrides.get(baseName) ?? prodPath);
    }
    for (const [baseName, stgPath] of stgOverrides) {
      if (!prodFiles.has(baseName)) stagingEnvPaths.push(stgPath);
    }

    const loadFile = (filePath) => ({
      filePath,
      definitions: yaml.load(fs.readFileSync(filePath, 'utf8'))
    });

    return {
      prod: prodEnvPaths.map(loadFile),
      staging: stagingEnvPaths.map(loadFile)
    };
  },
  async getAllDefinitions () {
    const files = await getFiles(DEFINITIONS_DIR);
    const definitionFiles = files.filter(file => file.includes(DEFINITION_FILE_NAME) || file.includes(DEFINITION_FILE_NAME_STG));
    return new Map(definitionFiles.map((filename) => [filename, yaml.load(fs.readFileSync(filename, 'utf8'))]));
  },

  sanitizeDashboard (fileContent) {
    return fileContent
      .replace(/"accountId"\s*:\s*\d+\s*/g, '"accountId": 0') // Anonymize account ID
      .replace(/^.+"linkedEntityGuids".+\n?/mg, '') // Remove linkedEntityGuids
      .replace(/^.+"permissions".+\n?/mg, '') // Remove permissions
      .replace(/^.+"variables"\s*:\s*\[\s*]\n?/mg, '') // Remove empty variables array, if the array is not empty, user should see an error during validation.
    // Remove trailing commas - Pattern translation:
    // A comma + positive look ahead for closing braces.
    // Further, optional whitespaces and optional line breaks
    // between comma and closing braces.
      .replace(/,(?=\s*[\r?\n]?\s*[\]}])/g, '');
  }
};
