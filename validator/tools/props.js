module.exports = {
  DEFINITIONS_DIR: process.env.DEFINITIONS_DIR || '../entity-types/',
  RELATIONSHIPS_SYNTHESIS_DIR: process.env.RELATIONSHIPS_SYNTHESIS_DIR || '../relationships/synthesis/',
  RELATIONSHIPS_CANDIDATES_DIR: process.env.RELATIONSHIPS_CANDIDATES_DIR || '../relationships/candidates/',
  DEFINITION_FILE_NAME: 'definition.yml',
  DASHBOARD_FILE_NAME_SUFFIX: 'dashboard.json',
  FILE_ENCODING: 'UTF-8'
};
