const utils = require('./utils');
const path = require('path');
const fs = require('fs');
const { FILE_ENCODING } = require('./props');
const DASHBOARDS_FOLDER = './tools/tests/dashboards/';
const ORIGINAL_DASHBOARD_PATH = path.resolve(DASHBOARDS_FOLDER, 'rawDashboard.json');
const DASHBOARD_WITH_VARIABLES_PATH = path.resolve(DASHBOARDS_FOLDER, 'dashboardWithVariables.json');
const SANITIZED_DASHBOARD_PATH = path.resolve(DASHBOARDS_FOLDER, 'sanitizedDashboard.json');

test('sanitizeDashboard returns the expected dashboard', () => {
  const originalDashboard = fs.readFileSync(ORIGINAL_DASHBOARD_PATH, FILE_ENCODING);
  const expectedSanitizedDashboard = fs.readFileSync(SANITIZED_DASHBOARD_PATH, FILE_ENCODING);

  const sanitizedDashboard = utils.sanitizeDashboard(originalDashboard);

  expect(originalDashboard).not.toBe(sanitizedDashboard);
  expect(expectedSanitizedDashboard).toBe(sanitizedDashboard);
});

test('sanitizeDashboard on an already sanitized dashboard does nothing', () => {
  const originalDashboard = fs.readFileSync(SANITIZED_DASHBOARD_PATH, FILE_ENCODING);

  const sanitizedDashboard = utils.sanitizeDashboard(originalDashboard);

  expect(originalDashboard).toBe(sanitizedDashboard);
});

test('sanitizeDashboard on a dashboard with variables does nothing', () => {
  // We shouldn't remove variables if they exist, otherwise the user might erroneoully think that the dashboard is valid
  // if they reference the variables inside of the queries.
  // Instead the user will hit an error when they run the validate command.
  const originalDashboard = fs.readFileSync(DASHBOARD_WITH_VARIABLES_PATH, FILE_ENCODING);

  const sanitizedDashboard = utils.sanitizeDashboard(originalDashboard);

  expect(originalDashboard).toBe(sanitizedDashboard);
});
