const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const {readdir} = require('fs').promises
const {DEFINITIONS_DIR} = require('./props')

async function getFiles(dir) {
    const items = await readdir(dir, {withFileTypes: true})
    const files = await Promise.all(items.map((item) => {
        const res = path.resolve(dir, item.name);
        return item.isDirectory() ? getFiles(res) : res;
    }));
    return files.reduce((a, f) => a.concat(f), []);
}

module.exports = {
    async getAllDefinitions() {
        const files = await getFiles(DEFINITIONS_DIR)
        const definitionFiles = files.filter(file => file.includes('definition.yml'))
        return definitionFiles.map((filename) => {
                return yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
            }
        )
    },
    sanitizeDashboard(fileContent){
        return fileContent
                .replace(/\"accountId\"\s*:\s*\d+\s*/g , '"accountId": 0') // Anonymize account ID
                .replace(/^.+\"linkedEntityGuids\".+\n?/mg , '')           // Remove linkedEntityGuids
                .replace(/^.+\"permissions\".+\n?/mg , '')                 // Remove permissions
                // Remove trailing commas - Pattern translation:
                // A comma + positive look ahead for closing braces.
                // Further, optional whitespaces and optional line breaks
                // between comma and closing braces.
                .replace(/\,(?=\s*[\r?\n]?\s*[\]\}])/g,'');

    }
}
