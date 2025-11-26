const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

function generateRuleName(domain, type, rule, existingNames, isStaging) {
  // Start with domain_type in lowercase
  let baseName = `${domain.toLowerCase()}_${type.toLowerCase()}`;

  // Add identifier or 'composite'
  if (rule.identifier) {
    // Clean identifier - remove special characters, replace dots/spaces with underscores
    const cleanIdentifier = rule.identifier.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/[.-]/g, '_');
    baseName += `_${cleanIdentifier}`;
  } else if (rule.compositeIdentifier) {
    baseName += '_composite';
  } else {
    baseName += '_rule';
  }

  // Add _stg suffix for staging files
  if (isStaging) {
    baseName += '_stg';
  }

  // Check for duplicates and add incremental number if needed
  let ruleName = baseName;
  let counter = 2;
  while (existingNames.has(ruleName)) {
    ruleName = `${baseName}_${counter}`;
    counter++;
  }

  existingNames.add(ruleName);
  return ruleName;
}

async function processDefinitionFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const definition = yaml.load(content);

    // Skip if no synthesis or synthesis is disabled
    if (!definition.synthesis || definition.synthesis.disabled === true) {
      return { updated: false, filePath };
    }

    // Skip if no rules array
    if (!definition.synthesis.rules) {
      return { updated: false, filePath };
    }

    // Check if this is a staging file
    const isStaging = filePath.includes('.stg.yml');

    let updated = false;
    const existingNames = new Set();

    // Process each rule
    definition.synthesis.rules.forEach((rule, index) => {
      // If ruleName already exists and it's not a staging file, skip
      if (rule.ruleName && !isStaging) {
        existingNames.add(rule.ruleName);
        return;
      }

      // For staging files, regenerate the ruleName even if it exists
      // For non-staging files without ruleName, generate it
      const ruleName = generateRuleName(definition.domain, definition.type, rule, existingNames, isStaging);

      // Add ruleName as the first property of the rule
      const ruleKeys = Object.keys(rule).filter(k => k !== 'ruleName');
      const newRule = { ruleName };
      ruleKeys.forEach(key => {
        newRule[key] = rule[key];
      });

      // Replace the rule in the array
      definition.synthesis.rules[index] = newRule;
      updated = true;
    });

    if (updated) {
      // Write back to file
      const yamlContent = yaml.dump(definition, {
        indent: 2,
        lineWidth: -1, // Don't wrap long lines
        noRefs: true,
        sortKeys: false
      });
      await fs.writeFile(filePath, yamlContent, 'utf8');
      return { updated: true, filePath, count: definition.synthesis.rules.length };
    }

    return { updated: false, filePath };
  } catch (error) {
    return { error: error.message, filePath };
  }
}

async function main() {
  const definitionsDir = path.resolve(__dirname, '../../entity-types');

  // Find all definition files
  const files = glob.sync(`${definitionsDir}/*/definition*.yml`);

  console.log(`Found ${files.length} definition files`);

  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const result = await processDefinitionFile(file);
    processedCount++;

    if (result.error) {
      console.error(`Error processing ${result.filePath}: ${result.error}`);
      errorCount++;
    } else if (result.updated) {
      console.log(`Updated ${result.filePath} (${result.count} rules)`);
      updatedCount++;
    }

    if (processedCount % 50 === 0) {
      console.log(`Progress: ${processedCount}/${files.length}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${processedCount} files`);
  console.log(`Updated: ${updatedCount} files`);
  console.log(`Errors: ${errorCount} files`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
