const utils = require('./utils');
const { DEFINITIONS_DIR,DASHBOARD_FILE_NAME_SUFFIX,FILE_ENCODING} = require('./props');
const {readdir} = require('fs').promises;
const path = require('path');
const fs = require('fs')
const DASHBOARDS_FOLDER = "./tools/tests/dashboards/"
const ORIGINAL_DASHBOARD_PATH = path.resolve(DASHBOARDS_FOLDER, "rawDashboard.json" )
const SANITIZED_DASHBOARD_PATH = path.resolve(DASHBOARDS_FOLDER, "sanitizedDashboard.json")

test('sanitizeDashboard returns the expected dashboard', () => {
    let originalDashboard = fs.readFileSync(ORIGINAL_DASHBOARD_PATH, FILE_ENCODING)
    let expectedSanitizedDashboard = fs.readFileSync(SANITIZED_DASHBOARD_PATH, FILE_ENCODING)

    let sanitizedDashboard = utils.sanitizeDashboard(originalDashboard)

    expect(originalDashboard).not.toBe(sanitizedDashboard);
    expect(expectedSanitizedDashboard).toBe(sanitizedDashboard);
});

test('sanitizeDashboard on an already sanitized dashboard does nothing', () => {
    let originalDashboard = fs.readFileSync(SANITIZED_DASHBOARD_PATH, FILE_ENCODING)

    let sanitizedDashboard = utils.sanitizeDashboard(originalDashboard)

    expect(originalDashboard).toBe(sanitizedDashboard);
});