const os = require('os');
const { execFile } = require('child_process');
const path = require('path');

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

const WINDOWS_NATIVE_PROCESS_NAMES = {
  word: ['WINWORD'],
  excel: ['EXCEL'],
  powerpoint: ['POWERPNT']
};

const WINDOWS_BROWSER_PROCESS_NAMES = ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'arc'];

const WINDOWS_BROWSER_TITLE_PATTERNS = {
  docs: ['Google Docs', 'docs.google.com'],
  sheets: ['Google Sheets', 'docs.google.com', 'sheets.google.com'],
  slides: ['Google Slides', 'docs.google.com', 'slides.google.com'],
  word: ['Word', 'word.office.com', 'Word Online'],
  excel: ['Excel', 'excel.office.com', 'Excel Online'],
  powerpoint: ['PowerPoint', 'powerpoint.office.com', 'PowerPoint Online']
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
    ? path.join(__dirname, '..', 'helper', 'shortcut-helper.exe')
    : path.join(__dirname, '..', 'helper', 'shortcut-helper');
}

function formatHelperSpawnError(error) {
  const helper = helperPath();
  if (error?.code === 'EFTYPE') {
    return `Shortcut helper is not a valid ${os.platform()} executable: ${helper}. Rebuild the Go helper on this machine and restart the server.`;
  }
  if (error?.code === 'ENOENT') {
    return `Shortcut helper was not found: ${helper}. Build the Go helper on this machine and restart the server.`;
  }
  return error?.message || 'Failed to launch shortcut helper.';
}

function escapePowerShellDoubleQuoted(value) {
  return String(value || '').replace(/`/g, '``').replace(/"/g, '`"');
}

function normaliseWindowsKeyToken(token) {
  return String(token || '').trim().toLowerCase();
}

function windowsPrimaryKeyToken(token) {
  const key = normaliseWindowsKeyToken(token);
  const map = {
    enter: '{ENTER}',
    return: '{ENTER}',
    tab: '{TAB}',
    escape: '{ESC}',
    esc: '{ESC}',
    backspace: '{BACKSPACE}',
    delete: '{DELETE}',
    space: ' ',
    left: '{LEFT}',
    arrowleft: '{LEFT}',
    right: '{RIGHT}',
    arrowright: '{RIGHT}',
    up: '{UP}',
    arrowup: '{UP}',
    down: '{DOWN}',
    arrowdown: '{DOWN}',
    home: '{HOME}',
    end: '{END}',
    pageup: '{PGUP}',
    pagedown: '{PGDN}'
  };
  if (/^f([1-9]|1[0-2])$/.test(key)) return `{${key.toUpperCase()}}`;
  if (map[key]) return map[key];
  if (key.length === 1) return windowsTextToSendKeys(key);
  return windowsTextToSendKeys(token);
}

function windowsTextToSendKeys(value) {
  return Array.from(String(value || '')).map((char) => {
    const specials = {
      '+': '{+}',
      '^': '{^}',
      '%': '{%}',
      '~': '{~}',
      '(': '{(}',
      ')': '{)}',
      '[': '{[}',
      ']': '{]}',
      '{': '{{}',
      '}': '{}}'
    };
    if (char === '\n') return '{ENTER}';
    if (char === '\r') return '';
    return specials[char] || char;
  }).join('');
}

function windowsComboToSendKeys(keys = []) {
  const normalised = Array.isArray(keys) ? keys.map(normaliseWindowsKeyToken).filter(Boolean) : [];
  const modifierPrefix = normalised.map((key) => {
    if (key === 'ctrl' || key === 'control') return '^';
    if (key === 'alt' || key === 'option') return '%';
    if (key === 'shift') return '+';
    return '';
  }).join('');
  const primary = normalised.find((key) => !['ctrl', 'control', 'alt', 'option', 'shift'].includes(key));
  if (!primary) return '';
  return `${modifierPrefix}${windowsPrimaryKeyToken(primary)}`;
}

function buildWindowsStepScript(steps = []) {
  const lines = [
    '$wshell = New-Object -ComObject WScript.Shell',
    '$ErrorActionPreference = "Stop"'
  ];

  (Array.isArray(steps) ? steps : []).forEach((step) => {
    if (!step || typeof step !== 'object') return;
    if (step.type === 'keyCombo') {
      const sendKeys = windowsComboToSendKeys(step.keys);
      if (sendKeys) {
        lines.push(`$wshell.SendKeys("${escapePowerShellDoubleQuoted(sendKeys)}")`);
        lines.push('Start-Sleep -Milliseconds 160');
      }
      return;
    }
    if (step.type === 'keyPress') {
      const keys = [...(Array.isArray(step.modifiers) ? step.modifiers : []), step.key].filter(Boolean);
      const sendKeys = windowsComboToSendKeys(keys);
      if (sendKeys) {
        lines.push(`$wshell.SendKeys("${escapePowerShellDoubleQuoted(sendKeys)}")`);
        lines.push('Start-Sleep -Milliseconds 90');
      }
      return;
    }
    if (step.type === 'text') {
      const sendKeys = windowsTextToSendKeys(step.value || '');
      if (sendKeys) {
        lines.push(`$wshell.SendKeys("${escapePowerShellDoubleQuoted(sendKeys)}")`);
        lines.push('Start-Sleep -Milliseconds 220');
      }
      return;
    }
    if (step.type === 'delay') {
      const duration = Math.max(50, Math.min(2000, Number(step.durationMs) || 150));
      lines.push(`Start-Sleep -Milliseconds ${duration}`);
      return;
    }
    if (step.type === 'repeatKeyPress') {
      const count = Math.max(1, Math.min(10, Number(step.count) || 1));
      const sendKeys = windowsPrimaryKeyToken(step.key);
      for (let i = 0; i < count; i += 1) {
        lines.push(`$wshell.SendKeys("${escapePowerShellDoubleQuoted(sendKeys)}")`);
        lines.push('Start-Sleep -Milliseconds 30');
      }
    }
  });

  return lines.join('\n');
}

function executeWindowsSteps(steps = []) {
  const script = buildWindowsStepScript(steps);
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr ? String(stderr).trim() : error.message));
          return;
        }
        resolve(String(stdout || '').trim());
      }
    );
  });
}

function activateNativeAppMac(appName) {
  const script = `tell application "${appName}" to activate`;
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 2000 }, () => resolve());
  });
}

function escapePowerShellSingleQuoted(value) {
  return String(value || '').replace(/'/g, "''");
}

function activateWindowWindows(processNames = [], titleHints = []) {
  const cleanProcessNames = [...new Set((Array.isArray(processNames) ? processNames : [])
    .map((name) => String(name || '').trim())
    .filter(Boolean))];
  const cleanTitleHints = [...new Set((Array.isArray(titleHints) ? titleHints : [])
    .map((title) => String(title || '').trim())
    .filter(Boolean))];

  if (!cleanProcessNames.length) {
    return Promise.resolve();
  }

  const processArray = cleanProcessNames
    .map((name) => `'${escapePowerShellSingleQuoted(name)}'`)
    .join(',');
  const titleArray = cleanTitleHints
    .map((title) => `'${escapePowerShellSingleQuoted(title)}'`)
    .join(',');

  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class KPFocus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue
$processNames = @(${processArray})
$titleHints = @(${titleArray})
$windows = foreach ($name in $processNames) {
  Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
}
$ordered = @()
if ($titleHints.Count -gt 0) {
  foreach ($hint in $titleHints) {
    $ordered += $windows | Where-Object { $_.MainWindowTitle -like "*$hint*" }
  }
}
$ordered += $windows
$target = $ordered | Select-Object -First 1
if ($target) {
  [KPFocus]::ShowWindowAsync($target.MainWindowHandle, 9) | Out-Null
  Start-Sleep -Milliseconds 50
  [KPFocus]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
}`.trim();

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 2500 },
      () => resolve()
    );
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

async function activateAppWindows(appId, activeBrowser, activeTitle) {
  const nativeProcesses = WINDOWS_NATIVE_PROCESS_NAMES[appId];
  if (nativeProcesses?.length) {
    await activateWindowWindows(nativeProcesses, activeTitle ? [activeTitle] : []);
    return;
  }

  const browserProcesses = activeBrowser
    ? [activeBrowser]
    : WINDOWS_BROWSER_PROCESS_NAMES;
  const titleHints = [];
  if (activeTitle) titleHints.push(activeTitle);
  titleHints.push(...(WINDOWS_BROWSER_TITLE_PATTERNS[appId] || []));
  await activateWindowWindows(browserProcesses, titleHints);
}

async function runHelper(payload) {
  if (os.platform() === 'darwin') {
    const isGoogleApp = ['docs', 'sheets', 'slides'].includes(payload.app);
    const activationDelayMs = isGoogleApp ? 325 : 150;
    await activateAppMac(payload.app, payload.activeUrl || '', payload.activeBrowser || '');
    await sleep(activationDelayMs);
  }
  if (os.platform() === 'win32') {
    await activateAppWindows(payload.app, payload.activeBrowser || '', payload.activeTitle || '');
    await sleep(180);
    return executeWindowsSteps(payload.steps || []);
  }

  return new Promise((resolve, reject) => {
    execFile(helperPath(), resolveHelperArgs(payload), (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr ? String(stderr).trim() : formatHelperSpawnError(error)));
        return;
      }
      resolve(String(stdout || '').trim());
    });
  });
}

module.exports = { runHelper };
