const { DEFINITIONS_DIR, DASHBOARD_FILE_NAME_SUFFIX, FILE_ENCODING} = require('./props');
const {readdir} = require('fs').promises;
const fs = require('fs');
const path = require('path');

(async () => {
    const folderDefinitions = await readdir(DEFINITIONS_DIR, {withFileTypes: true})
    for (let folderDefinition of folderDefinitions){
        if(folderDefinition.isDirectory()){
            const files = await readdir(path.resolve(DEFINITIONS_DIR, folderDefinition.name), {withFileTypes: true})
            for(let file of  files) {
                if(file.name.includes(DASHBOARD_FILE_NAME_SUFFIX)){
                    let filePath = path.resolve(DEFINITIONS_DIR, folderDefinition.name, file.name)
                    fs.readFile(filePath, FILE_ENCODING, function(err, fileContent){
                        if (err){
                            console.error(`Error reading ${file.name} in ${folderDefinition.name}`)
                            process.exit(1)
                        }

                        let newFileContent = fileContent
                            .replace(/\"accountId\"\s*:\s*\d+\s*/g , '"accountId": 0') // Anonymize account ID
                            .replace(/^.+\"linkedEntityGuids\".+\n?/mg , '') // Remove linkedEntityGuids
                            .replace(/^.+\"permissions\".+\n?/mg , '') // Remove permissions
                            .replace(/\,(?!\s*?[\{\[\"\'\w])/g, ''); // Remove trailing commas

                        if(newFileContent !== fileContent){
                            fs.writeFile(filePath, newFileContent, FILE_ENCODING, function (err) {
                                if (err){
                                    console.error(`Error updating ${file.name} in ${folderDefinition.name}`)
                                    process.exit(1)
                                } else{
                                    console.log(`=> Sanitized ${file.name} in ${folderDefinition.name}`)
                                }
                            });
                        }
                    });
                }

            }
        }
    }
})();
