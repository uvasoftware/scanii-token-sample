// Playwright config for the e2e suite in tests/. The express app is started
// automatically before the test run via `webServer`, pointed at scanii-cli at
// localhost:4000.
const { defineConfig } = require('@playwright/test');

const SCANII_CLI = process.env.SCANII_TEST_ENDPOINT || 'http://localhost:4000';
const PORT = process.env.PORT || '3100';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node app.js',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT,
      SCANII_CREDS: 'key:secret',
      SCANII_ENDPOINT: SCANII_CLI,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
