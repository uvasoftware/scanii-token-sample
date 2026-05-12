// End-to-end browser tests for the client-side arbitration sample.
//
// The express app is started by playwright.config.js. These tests need a
// scanii-cli mock server running at the configured SCANII_TEST_ENDPOINT
// (default http://localhost:4000). If scanii-cli is not reachable, the
// suite is skipped so `npm run test:e2e` is safe to run without it.
//
// Run scanii-cli locally with:
//   docker run -d --name scanii-cli -p 4000:4000 \
//     ghcr.io/scanii/scanii-cli:latest server -a 0.0.0.0:4000
const { test, expect } = require('@playwright/test');

const SCANII_CLI = process.env.SCANII_TEST_ENDPOINT || 'http://localhost:4000';
const CREDS = 'Basic ' + Buffer.from('key:secret').toString('base64');
// scanii-cli recognizes this UUID as a malware fixture and returns the
// `content.malicious.local-test-file` finding. See CLAUDE.md §5.
const MALWARE_FIXTURE = '38DCC0C9-7FB6-4D0D-9C37-288A380C6BB9';

let cliReachable = false;
let malwareFixtureSupported = false;

test.beforeAll(async () => {
  try {
    const r = await fetch(`${SCANII_CLI}/v2.2/ping`, { headers: { Authorization: CREDS } });
    cliReachable = r.ok;
  } catch {
    cliReachable = false;
  }
  if (!cliReachable) return;

  // Probe whether this scanii-cli build recognizes the UUID malware fixture.
  // Older builds don't — the malware test self-skips in that case.
  const form = new FormData();
  form.append('file', new Blob([MALWARE_FIXTURE]), 'fixture.txt');
  const r = await fetch(`${SCANII_CLI}/v2.2/files`, { method: 'POST', headers: { Authorization: CREDS }, body: form });
  if (r.ok) {
    const body = await r.json();
    malwareFixtureSupported = Array.isArray(body.findings) && body.findings.includes('content.malicious.local-test-file');
  }
});

test.beforeEach(({}, testInfo) => {
  test.skip(!cliReachable, `scanii-cli not reachable at ${SCANII_CLI}`);
});

test('clean file: full flow ends on /success.html', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'clean.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('totally clean content'),
  });
  await page.locator('button:has-text("Submit")').click();
  await page.waitForURL('**/success.html');
  expect(page.url()).toMatch(/\/success\.html$/);
});

test('malware fixture: browser blocks upload with "Content denied"', async ({ page }) => {
  test.skip(!malwareFixtureSupported, 'scanii-cli does not recognize the local malware fixture');

  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'malware.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(MALWARE_FIXTURE),
  });
  await page.locator('button:has-text("Submit")').click();
  await expect(page.locator('#pacer')).toContainText('Content denied');
  // Form submit was suppressed, so we should still be on the index page.
  expect(page.url()).not.toMatch(/\/success\.html$/);
});
