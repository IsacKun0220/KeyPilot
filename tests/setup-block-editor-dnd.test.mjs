import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'server', 'panel-config.json');
const PLAYWRIGHT_BROWSERS_PATH = '/tmp/keypilot-playwright-browsers';
const APP_IDS = ['word', 'excel', 'powerpoint', 'docs', 'sheets', 'slides'];
const STEP_TYPES = ['keyCombo', 'keyPress', 'text', 'delay', 'repeatKeyPress'];
const COLLAPSED_TARGET_CATEGORY = {
  keyCombo: 'text',
  keyPress: 'keyCombo',
  text: 'keyCombo',
  delay: 'keyCombo',
  repeatKeyPress: 'keyCombo'
};

let originalConfig = null;
let serverProcess = null;
let browser = null;
let baseUrl = '';

function createEmptyConfig() {
  return {
    activeProfile: 'default',
    activeApp: 'word',
    autoSwitchEnabled: false,
    apps: Object.fromEntries(APP_IDS.map((appId) => [
      appId,
      {
        id: appId,
        name: appId,
        group: '',
        customButtons: [],
        sets: [
          {
            id: 'set-1',
            name: 'Main',
            buttons: [null, null, null, null, null]
          }
        ]
      }
    ]))
  };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/config`);
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function launchBrowser() {
  return chromium.launch({
    executablePath: path.join(
      PLAYWRIGHT_BROWSERS_PATH,
      'chromium_headless_shell-1217',
      'chrome-headless-shell-mac-arm64',
      'chrome-headless-shell'
    ),
    headless: true
  });
}

async function waitForStepCount(page, expected) {
  await page.waitForFunction((count) => {
    const canvas = document.querySelector('[data-kp-canvas]');
    return canvas?.dataset.kpStepCount === String(count);
  }, expected);

  const actualCount = await page.locator('[data-kp-canvas]').getAttribute('data-kp-step-count');
  assert.equal(actualCount, String(expected));
}

async function getStepIndexByType(page, type) {
  const step = page.locator(`[data-kp-step-type="${type}"]`).first();
  await step.waitFor();
  const index = await step.getAttribute('data-step-index');
  assert.notEqual(index, null, `${type} step should expose a step index`);
  return Number(index);
}

async function dragBetween(page, sourceLocator, targetLocator, options = {}) {
  await sourceLocator.scrollIntoViewIfNeeded();
  await targetLocator.scrollIntoViewIfNeeded();

  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();

  assert(sourceBox, 'Source element needs a bounding box for drag');
  assert(targetBox, 'Target element needs a bounding box for drag');

  const sourceX = sourceBox.x + (options.sourceX ?? sourceBox.width / 2);
  const sourceY = sourceBox.y + (options.sourceY ?? sourceBox.height / 2);
  const targetX = targetBox.x + (options.targetX ?? targetBox.width / 2);
  const targetY = targetBox.y + (options.targetY ?? targetBox.height / 2);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 12, sourceY + 12, { steps: 4 });
  await page.mouse.move(targetX, targetY, { steps: 18 });
  await page.mouse.up();
}

async function selectDropdownOption(page, key, value) {
  const toggle = page.locator(`[data-toggle-dropdown="${key}"]`);
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click({ force: true });
  await page.locator(`[data-dropdown-choice="${key}"][data-dropdown-value="${value}"]`).click();
}

async function openEditorOnSteps(page) {
  await page.goto(`${baseUrl}/setup.html`);
  await page.locator('[data-slot-index="0"].empty').click();
  await page.locator('[data-editor-nav="next"]').click();
  await page.locator('[data-kp-canvas]').waitFor();
  await page.waitForFunction(() => Boolean(window.__KP_TEST__?.blockEditor?.hasActiveDrake?.()));
}

async function addStepFromPalette(page, type) {
  await page.locator(`[data-kp-toggle-category="${type}"]`).click();
  const inserted = await page.evaluate((stepType) => window.__KP_TEST__?.blockEditor?.addPaletteStepToCanvas?.(stepType), type);
  assert.equal(inserted, true, `Expected to add ${type} from the palette`);
}

async function buildEditedSequence(page) {
  await openEditorOnSteps(page);

  for (const type of STEP_TYPES) {
    const existingCount = await page.locator(`[data-kp-step-type="${type}"]`).count();
    if (existingCount === 0) {
      await addStepFromPalette(page, type);
    }
  }

  await waitForStepCount(page, STEP_TYPES.length);

  const keyComboIndex = await getStepIndexByType(page, 'keyCombo');
  await page.locator(`[data-kp-record="${keyComboIndex}"]`).click();
  await page.keyboard.down('Shift');
  await page.keyboard.press('K');
  await page.keyboard.up('Shift');
  await page.locator(`[data-kp-stop-recording="${keyComboIndex}"]`).click();
  await assertStepHasChips(page, 'keyCombo');

  const keyPressIndex = await getStepIndexByType(page, 'keyPress');
  await selectDropdownOption(page, `step:${keyPressIndex}:pressKey`, 'Tab');

  const textIndex = await getStepIndexByType(page, 'text');
  await page.locator(`textarea[data-step-index="${textIndex}"]`).fill('Edited text');

  const delayIndex = await getStepIndexByType(page, 'delay');
  await page.locator(`input[data-quando-name="durationMs"][data-step-index="${delayIndex}"]`).fill('400');
  await selectDropdownOption(page, `step:${delayIndex}:delayUnit`, 'milliseconds');

  const repeatIndex = await getStepIndexByType(page, 'repeatKeyPress');
  await selectDropdownOption(page, `step:${repeatIndex}:repeatKey`, 'PageDown');
  await page.locator(`input[data-quando-name="count"][data-step-index="${repeatIndex}"]`).fill('3');

  await page.waitForFunction((index) => (
    document.querySelector(`textarea[data-step-index="${index}"]`)?.value === 'Edited text'
  ), textIndex);
}

async function assertStepHasChips(page, type) {
  const chipCount = await page.locator(`[data-kp-step-type="${type}"] .kp-key-chip`).count();
  assert(chipCount > 0, `${type} step should keep its recorded shortcut`);
}

async function removeStepByDraggingToPalette(page, type, paletteMode, expectedCount) {
  const targetCategory = paletteMode === 'expanded' ? type : COLLAPSED_TARGET_CATEGORY[type];
  await page.locator(`[data-kp-toggle-category="${targetCategory}"]`).click();

  const stepHandle = page.locator(`[data-kp-step-type="${type}"] [data-kp-drag-handle]`).first();
  await stepHandle.waitFor();

  const removed = await page.evaluate((stepType) => window.__KP_TEST__?.blockEditor?.removeCanvasStepToPalette?.(stepType), type);
  assert.equal(removed, true, `Expected to remove ${type} by dropping it back on the palette`);

  await waitForStepCount(page, expectedCount);
  await assertCanvasTypes(page, expectedCount);
}

async function assertCanvasTypes(page, expectedCount) {
  const stepCount = await page.locator('[data-kp-canvas] [data-kp-step-type]').count();
  assert.equal(stepCount, expectedCount);
}

async function runRemovalScenario(page, paletteMode) {
  await buildEditedSequence(page);

  let remaining = STEP_TYPES.length;
  for (const type of STEP_TYPES) {
    remaining -= 1;
    await removeStepByDraggingToPalette(page, type, paletteMode, remaining);
  }
}

test.before(async () => {
  originalConfig = await fs.readFile(CONFIG_PATH, 'utf8').catch(() => '');
  await fs.writeFile(CONFIG_PATH, JSON.stringify(createEmptyConfig(), null, 2));

  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['server/server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let startupError = '';
  serverProcess.stderr.on('data', (chunk) => {
    startupError += chunk.toString();
  });

  await waitForServer(baseUrl).catch((error) => {
    throw new Error(startupError || error.message);
  });

  browser = await launchBrowser();
});

test.after(async () => {
  await browser?.close().catch(() => {});

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      serverProcess.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }

  if (originalConfig !== null) {
    await fs.writeFile(CONFIG_PATH, originalConfig);
  }
});

test('edited canvas steps can always be dragged back to the palette', async () => {
  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 1200
    }
  });

  await runRemovalScenario(page, 'expanded');
  await runRemovalScenario(page, 'collapsed');

  await page.close();
});
