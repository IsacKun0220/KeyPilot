const os = require('os');
const { execFile } = require('child_process');

// Map app IDs to the macOS application name used for activation.
// Google apps run inside the browser, so we activate the browser instead.
const MAC_APP_NAMES = {
  word: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpoint: 'Microsoft PowerPoint',
  docs: 'Google Chrome',
  sheets: 'Google Chrome',
  slides: 'Google Chrome'
};

// Attempt to bring the target app to the foreground on macOS.
// This is best-effort: if the app is not running the trigger still proceeds.
function activateAppMac(appId) {
  const appName = MAC_APP_NAMES[appId];
  if (!appName) return Promise.resolve();
  const script = `tell application "${appName}" to activate`;
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 2000 }, () => resolve());
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHelperArgs(payload) {
  console.log('[KeyPilot] runHelper payload', JSON.stringify({
    app: payload.app,
    buttonId: payload.buttonId,
    platform: payload.platform,
    stepCount: Array.isArray(payload.steps) ? payload.steps.length : 0,
    steps: payload.steps || []
  }));
  return [
    payload.app,
    payload.buttonId,
    JSON.stringify(payload.steps || [])
  ];
}

function helperPath() {
  return os.platform() === 'win32'
    ? require('path').join(__dirname, '..', 'helper', 'shortcut-helper.exe')
    : require('path').join(__dirname, '..', 'helper', 'shortcut-helper');
}

async function runHelper(payload) {
  // Activate the target app before firing keystrokes so the keys land in the
  // right window regardless of what was focused on the Mac at tap time.
  if (os.platform() === 'darwin') {
    const activationDelayMs = ['docs', 'sheets', 'slides'].includes(payload.app) ? 325 : 150;
    await activateAppMac(payload.app);
    await sleep(activationDelayMs); // give the window manager time to complete focus switch
  }

  return new Promise((resolve, reject) => {
    execFile(helperPath(), resolveHelperArgs(payload), (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr ? String(stderr) : error.message));
        return;
      }
      resolve(String(stdout || '').trim());
    });
  });
}

module.exports = {
  runHelper
};
