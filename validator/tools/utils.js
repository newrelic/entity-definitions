const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const githubHelper = require('./ghHelper');
const { readdir } = fs.promises;
const { DEFINITIONS_DIR } = require('./props');
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
  async getAllDefinitions () {
    const files = await getFiles(DEFINITIONS_DIR);
    const definitionFiles = files.filter(file => file.includes('definition.yml'));
    return definitionFiles.map((filename) => {
      return yaml.load(fs.readFileSync(filename, 'utf8'));
    }
    );
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
