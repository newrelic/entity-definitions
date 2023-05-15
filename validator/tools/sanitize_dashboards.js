const { DEFINITIONS_DIR,DASHBOARD_FILE_NAME_SUFFIX,FILE_ENCODING} = require('./props');
const fs = require('fs')
const {readdir} = fs.promises;
const path = require('path');
const utils = require('./utils');

(async () => {
    const folderDefinitions = await readdir(DEFINITIONS_DIR, {withFileTypes: true})
    for (let folderDefinition of folderDefinitions){
        if(folderDefinition.isDirectory()){
            const folderName = folderDefinition.name
            const files = await readdir(path.resolve(DEFINITIONS_DIR, folderDefinition.name), {withFileTypes: true})
            for(let file of files) {
                if(file.name.includes(DASHBOARD_FILE_NAME_SUFFIX)){
                    let filePath = path.resolve(DEFINITIONS_DIR, folderName, file.name)
                    let fileContent = fs.readFileSync(filePath, FILE_ENCODING)
                    let newFileContent = utils.sanitizeDashboard(fileContent)
                    if(newFileContent !== fileContent){
                        fs.writeFile(filePath, newFileContent, FILE_ENCODING, function (err) {
                            if (err){
                                console.error(`Error updating ${file.name} in ${folderName}`)
                                process.exit(1)
                            } else{
                                console.log(`=> Sanitized ${file.name} in ${folderName}`)
                            }
                        });
                    }
                }
            }
        }
    }
})();
