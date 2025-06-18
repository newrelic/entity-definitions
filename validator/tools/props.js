module.exports = {
  DEFINITIONS_DIR: process.env.DEFINITIONS_DIR || '../entity-types/',
  RELATIONSHIPS_SYNTHESIS_DIR: process.env.RELATIONSHIPS_SYNTHESIS_DIR || '../relationships/synthesis/',
  RELATIONSHIPS_CANDIDATES_DIR: process.env.RELATIONSHIPS_CANDIDATES_DIR || '../relationships/candidates/',
  DEFINITION_FILE_NAME: 'definition.yml',
  DEFINITION_FILE_NAME_STG: 'definition.stg.yml',
  DASHBOARD_FILE_NAME_SUFFIX: 'dashboard.json',
  DASHBOARD_FILE_NAME_SUFFIX_STG: 'dashboard.stg.json',
  FILE_ENCODING: 'UTF-8'
};
