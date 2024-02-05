describe('load github loader', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('if the github token is not defined in the env values the helper should not be enabled', () => {
    delete process.env.GITHUB_TOKEN;

    const githubHelper = require('./ghHelper');
    expect(githubHelper.enabled).toBe(false);
  });

  test('if the github pr is not defined in the env values the helper should not be enabled', () => {
    delete process.env.PR_NUMBER;

    const githubHelper = require('./ghHelper');
    expect(githubHelper.enabled).toBe(false);
  });

  test('if the github repository is not defined in the env values the helper should not be enabled', () => {
    delete process.env.GITHUB_REPOSITORY;

    const githubHelper = require('./ghHelper');
    expect(githubHelper.enabled).toBe(false);
  });

  test('if the GH TOKEN, PR, REPOSITORY is defined in the env values the helper should be enabled', () => {
    // force to have the defined env values
    process.env.GITHUB_TOKEN = '***';
    process.env.PR_NUMBER = '1';
    process.env.GITHUB_REPOSITORY = 'newrelic/entity_definitions';

    const githubHelper = require('./ghHelper');
    expect(githubHelper.enabled).toBe(true);
  });
});
