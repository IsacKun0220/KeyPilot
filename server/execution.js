const os = require('os');
const { execFile } = require('child_process');

// Native desktop apps activated by process name.
const NATIVE_APP_NAMES = {
  word: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpoint: 'Microsoft PowerPoint'
};

// URL path segments used as fallback when no exact tab URL is available from
// detection (e.g. the cache expired, or the browser doesn't expose a URL).
const BROWSER_URL_PATTERNS = {
  docs: 'docs.google.com/document',
  sheets: 'docs.google.com/spreadsheets',
  slides: 'docs.google.com/presentation',
  word: 'word.office.com',
  excel: 'excel.office.com',
  powerpoint: 'powerpoint.office.com'
};

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

function activateNativeAppMac(appName) {
  const script = `tell application "${appName}" to activate`;
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 2000 }, () => resolve());
  });
}

// Activate the specific browser window/tab that contains the target app.
//
// Strategy:
//   1. Try to match by the exact URL captured at detection time (stripped of
//      query-string and fragment so minor URL changes don't break the match).
//   2. If no tab matches, fall back to a known domain/path pattern for the app.
//   3. If still nothing matches, just bring the browser app to front.
//
// This ensures that when the user has two Chrome windows each with Google
// Workspace tabs, the shortcut lands in the correct window — not whichever
// window Chrome arbitrarily considers "front".
function activateBrowserTabMac(browser, exactUrl, fallbackPattern) {
  const browserName = browser || 'Google Chrome';

  // Strip query-string and fragment to get a stable path segment.
  const stableUrl = exactUrl ? exactUrl.split('?')[0].split('#')[0] : '';

  if (!stableUrl && !fallbackPattern) {
    return activateNativeAppMac(browserName);
  }

  // Escape double-quotes in URL strings for safe embedding in AppleScript.
  function escAS(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

  // Build a match expression: prefer exact stable URL, OR fall back to pattern.
  const conditions = [];
  if (stableUrl) conditions.push(`URL of t contains "${escAS(stableUrl)}"`);
  if (fallbackPattern && fallbackPattern !== stableUrl) {
    conditions.push(`URL of t contains "${escAS(fallbackPattern)}"`);
  }
  const matchExpr = conditions.join(' or ');

  const script = `
tell application "${browserName}"
  set activated to false
  repeat with w in windows
    set tabList to tabs of w
    repeat with i from 1 to count of tabList
      set t to item i of tabList
      if ${matchExpr} then
        set active tab index of w to i
        set index of w to 1
        activate
        set activated to true
        exit repeat
      end if
    end repeat
    if activated then exit repeat
  end repeat
  if not activated then activate
end tell`;

  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 2000 }, () => resolve());
  });
}

async function activateAppMac(appId, activeUrl, activeBrowser) {
  // Native desktop apps: simple process activation.
  const nativeName = NATIVE_APP_NAMES[appId];
  if (nativeName) return activateNativeAppMac(nativeName);

  // Browser-based apps: find and front the exact window/tab by URL.
  const browser = activeBrowser || 'Google Chrome';
  const fallbackPattern = BROWSER_URL_PATTERNS[appId] || '';
  return activateBrowserTabMac(browser, activeUrl || '', fallbackPattern);
}

async function runHelper(payload) {
  if (os.platform() === 'darwin') {
    const isGoogleApp = ['docs', 'sheets', 'slides'].includes(payload.app);
    const activationDelayMs = isGoogleApp ? 325 : 150;
    await activateAppMac(payload.app, payload.activeUrl || '', payload.activeBrowser || '');
    await sleep(activationDelayMs);
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

module.exports = { runHelper };
