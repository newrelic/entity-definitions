const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const { readdir } = require('fs').promises

const DEFINITIONS_DIR = '../definitions/'

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
        var files = await getFiles(DEFINITIONS_DIR)
        return files.map((filename) => {
                return yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
            }
        )
    }
}
