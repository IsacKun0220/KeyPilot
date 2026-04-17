const express = require('express');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const { ensureConfigShape, APP_IDS, findButtonById, resolveButtonSteps } = require('./config');
const { runHelper } = require('./execution');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CONFIG_PATH = path.join(__dirname, 'panel-config.json');
const UI_DIR = path.join(__dirname, '..', 'panel-ui');

let runtimeState = {
  activeApp: 'word',
  autoSwitchEnabled: true,
  configVersion: 0
};

let lastAppCheck = { ts: 0, app: null, browser: '', url: '' };
const APP_CHECK_CACHE_MS = 600;

async function detectForegroundApp() {
  if (Date.now() - lastAppCheck.ts < APP_CHECK_CACHE_MS) return lastAppCheck;
  let result = { app: null, browser: '', url: '' };
  if (os.platform() === 'darwin') result = await detectActiveAppMac();
  if (os.platform() === 'win32') result = await detectActiveAppWindows();
  lastAppCheck = { ts: Date.now(), ...result };
  return lastAppCheck;
}

let panelPresence = {
  lastSeenAt: 0,
  clientId: null,
  isPhoneClient: false,
  userAgent: '',
  viewport: ''
};

const PANEL_PRESENCE_TTL_MS = 7000;

async function loadConfig() {
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    const config = ensureConfigShape(JSON.parse(raw));
    runtimeState.activeApp = config.activeApp;
    runtimeState.autoSwitchEnabled = config.autoSwitchEnabled;
    return config;
  } catch (_) {
    const config = ensureConfigShape({});
    await saveConfig(config);
    return config;
  }
}

async function saveConfig(config) {
  const normalised = ensureConfigShape(config);
  runtimeState.activeApp = normalised.activeApp;
  runtimeState.autoSwitchEnabled = normalised.autoSwitchEnabled;
  runtimeState.configVersion += 1;
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(normalised, null, 2));
  return normalised;
}

function mapForegroundApp(name, title, url) {
  if (!name) return null;
  const t = String(title || '').toLowerCase();
  const u = String(url || '').toLowerCase();

  // Desktop apps matched by process name
  if (name.includes('word')) return 'word';
  if (name.includes('excel')) return 'excel';
  if (name.includes('powerpoint') || name.includes('powerpnt')) return 'powerpoint';

  const isBrowser = /chrome|edge|msedge|firefox|safari|arc|opera|brave/.test(name);
  if (isBrowser) {
    // URL-based detection is locale-independent and reliable for tab switches.
    // Chrome and Safari supply the URL via their AppleScript dictionary; other
    // browsers fall through to title matching.
    if (u) {
      if (u.includes('docs.google.com/document')) return 'docs';
      if (u.includes('docs.google.com/spreadsheets') || u.includes('sheets.google.com')) return 'sheets';
      if (u.includes('docs.google.com/presentation') || u.includes('slides.google.com')) return 'slides';
      if (/word\.office\.com|officeapps\.live\.com\/we\/wordeditor|word\.new/.test(u)) return 'word';
      if (/excel\.office\.com|officeapps\.live\.com\/x\/|excel\.new/.test(u)) return 'excel';
      if (/powerpoint\.office\.com|officeapps\.live\.com\/p\/|powerpoint\.new/.test(u)) return 'powerpoint';
    }
    // Title-based fallback for browsers without AppleScript URL access
    if (!t) return null;
    if (/google docs|docs\.google\.com/.test(t)) return 'docs';
    if (/google sheets|sheets\.google\.com/.test(t)) return 'sheets';
    if (/google slides|slides\.google\.com/.test(t)) return 'slides';
    if (/microsoft word|\bword online\b|\bword\b/.test(t)) return 'word';
    if (/microsoft excel|\bexcel online\b|\bexcel\b/.test(t)) return 'excel';
    if (/microsoft powerpoint|\bpowerpoint online\b|\bpowerpoint\b/.test(t)) return 'powerpoint';
    return null;
  }

  return null;
}

// Map a lowercased process name to the exact AppleScript application name
// used for targeted window activation.
function resolveAppleScriptBrowserName(procName) {
  if (/google chrome/.test(procName) || procName === 'chrome') return 'Google Chrome';
  if (procName === 'safari') return 'Safari';
  if (/microsoft edge/.test(procName) || /msedge/.test(procName)) return 'Microsoft Edge';
  if (procName === 'arc') return 'Arc';
  if (/brave/.test(procName)) return 'Brave Browser';
  if (/firefox/.test(procName)) return 'Firefox';
  return '';
}

function detectActiveAppMac() {
  return new Promise((resolve) => {
    // For Chrome and Safari we read the active tab URL directly from the browser's
    // AppleScript dictionary — this is instant, locale-independent, and survives
    // same-window tab switches without waiting for the window title to repaint.
    const script = `
      tell application "System Events"
        set frontProc to first application process whose frontmost is true
        set frontApp to name of frontProc
      end tell
      set frontTitle to ""
      set frontURL to ""
      try
        if frontApp is "Google Chrome" then
          tell application "Google Chrome"
            set frontTitle to title of active tab of front window
            set frontURL to URL of active tab of front window
          end tell
        else if frontApp is "Safari" then
          tell application "Safari"
            set frontTitle to name of current tab of front window
            set frontURL to URL of current tab of front window
          end tell
        else
          tell application "System Events"
            set frontTitle to name of front window of (first application process whose frontmost is true)
          end tell
        end if
      end try
      return frontApp & "|" & frontTitle & "|" & frontURL
    `;
    require('child_process').execFile('osascript', ['-e', script], { timeout: 1200 }, (error, stdout) => {
      if (error) { resolve({ app: null, browser: '', url: '' }); return; }
      const parts = String(stdout || '').trim().split('|');
      const procName = parts[0].toLowerCase();
      const url = parts[2] || '';
      const app = mapForegroundApp(procName, parts[1] || '', url);
      const browser = resolveAppleScriptBrowserName(procName);
      resolve({ app, browser, url });
    });
  });
}

function detectActiveAppWindows() {
  return new Promise((resolve) => {
    // Use GetForegroundWindow so we always get the actual focused window, not the
    // most-recently-started process (which was the old broken heuristic).
    const script = `
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;using System.Text;
public class KP{
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
}
"@ -ErrorAction SilentlyContinue
$h=[KP]::GetForegroundWindow();$sb=New-Object System.Text.StringBuilder 512
[KP]::GetWindowText($h,$sb,512)|Out-Null;$pid=0
[KP]::GetWindowThreadProcessId($h,[ref]$pid)|Out-Null
$p=Get-Process -Id $pid -ErrorAction SilentlyContinue
if($p){$p.ProcessName+"|"+$sb.ToString()}`.trim();
    require('child_process').execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout: 4000 }, (error, stdout) => {
      if (error) { resolve(null); return; }
      const parts = String(stdout || '').trim().split('|');
      resolve({ app: mapForegroundApp(parts[0].toLowerCase(), parts[1] || '', ''), browser: '', url: '' });
    });
  });
}

function getRuntimeUrls() {
  const nets = os.networkInterfaces();
  const localUrls = [];
  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        localUrls.push(`http://${entry.address}:${PORT}/panel.html`);
      }
    });
  });
  const uniqueUrls = [...new Set(localUrls)];
  return {
    runtimeUrl: uniqueUrls[0] || `http://localhost:${PORT}/panel.html`,
    localUrls: uniqueUrls
  };
}

function getPanelConnectionStatus() {
  const connected = Date.now() - panelPresence.lastSeenAt < PANEL_PRESENCE_TTL_MS;
  return {
    connected,
    lastSeenAt: panelPresence.lastSeenAt || null,
    clientId: connected ? panelPresence.clientId : null,
    isPhoneClient: connected ? panelPresence.isPhoneClient : false,
    userAgent: connected ? panelPresence.userAgent : '',
    viewport: connected ? panelPresence.viewport : ''
  };
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (/\.(html|css|js)$/i.test(req.path)) {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Surrogate-Control', 'no-store');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.static(UI_DIR));

app.get('/', (req, res) => {
  res.redirect('/setup.html');
});

app.get('/api/config', async (req, res) => {
  res.json({ config: await loadConfig(), configVersion: runtimeState.configVersion });
});

app.get('/api/state', async (req, res) => {
  if (runtimeState.autoSwitchEnabled) {
    const detected = await detectForegroundApp();
    if (detected.app && APP_IDS.includes(detected.app)) {
      runtimeState.activeApp = detected.app;
    }
  }
  res.json({
    activeApp: runtimeState.activeApp,
    configVersion: runtimeState.configVersion,
    autoSwitchEnabled: runtimeState.autoSwitchEnabled
  });
});

app.put('/api/config', async (req, res) => {
  const nextConfig = req.body && req.body.config ? req.body.config : req.body;
  res.json({ config: await saveConfig(nextConfig) });
});

app.get('/api/pairing', async (req, res) => {
  const { runtimeUrl, localUrls } = getRuntimeUrls();
  const qrDataUrl = await QRCode.toDataURL(runtimeUrl, { margin: 1, width: 320 });
  res.json({
    runtimeUrl,
    previewUrl: `http://localhost:${PORT}/panel.html`,
    localUrls,
    qrDataUrl,
    connection: getPanelConnectionStatus()
  });
});

app.get('/api/panel-presence', (req, res) => {
  const { runtimeUrl, localUrls } = getRuntimeUrls();
  res.json({
    connection: getPanelConnectionStatus(),
    runtimeUrl,
    previewUrl: `http://localhost:${PORT}/panel.html`,
    localUrls
  });
});

app.post('/api/panel-presence', (req, res) => {
  if (!req.body?.isPhoneClient) {
    res.json({ ok: true, connection: getPanelConnectionStatus() });
    return;
  }

  panelPresence = {
    lastSeenAt: Date.now(),
    clientId: typeof req.body?.clientId === 'string' ? req.body.clientId : 'panel',
    isPhoneClient: true,
    userAgent: typeof req.body?.userAgent === 'string' ? req.body.userAgent : '',
    viewport: typeof req.body?.viewport === 'string' ? req.body.viewport : ''
  };
  res.json({ ok: true, connection: getPanelConnectionStatus() });
});

app.post('/api/panel-presence/disconnect', (req, res) => {
  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId : null;
  if (!clientId || panelPresence.clientId === clientId) {
    panelPresence = {
      lastSeenAt: 0,
      clientId: null,
      isPhoneClient: false,
      userAgent: '',
      viewport: ''
    };
  }
  res.json({ ok: true, connection: getPanelConnectionStatus() });
});

app.get('/active-app', async (req, res) => {
  let result = { app: null };
  if (os.platform() === 'darwin') result = await detectActiveAppMac();
  if (os.platform() === 'win32') result = await detectActiveAppWindows();
  res.json({ activeApp: APP_IDS.includes(result.app) ? result.app : null });
});

app.get('/api/platform', (req, res) => {
  res.json({ platform: os.platform() });
});

app.post('/api/runtime-state', async (req, res) => {
  const config = await loadConfig();
  const saved = await saveConfig({
    ...config,
    activeApp: APP_IDS.includes(req.body?.activeApp) ? req.body.activeApp : config.activeApp,
    autoSwitchEnabled: typeof req.body?.autoSwitchEnabled === 'boolean' ? req.body.autoSwitchEnabled : config.autoSwitchEnabled
  });
  res.json({ config: saved });
});

app.post('/trigger', async (req, res) => {
  try {
    const config = await loadConfig();
    const appId = APP_IDS.includes(req.body?.app) ? req.body.app : config.activeApp;
    const platform = req.body?.platform === 'win' ? 'win' : 'mac';
    const buttonId = typeof req.body?.buttonId === 'string' ? req.body.buttonId : '';
    const button = findButtonById(config, appId, buttonId);
    const resolvedSteps = resolveButtonSteps(button, appId, platform);
    console.log('[KeyPilot] trigger request', JSON.stringify({
      appId,
      platform,
      buttonId,
      resolvedStepCount: resolvedSteps.length,
      resolvedSteps
    }));
    const steps = resolvedSteps.length
      ? resolvedSteps
      : (Array.isArray(req.body?.steps) && req.body.steps.length ? req.body.steps : []);

    if (!steps.length) {
      res.status(400).json({ error: 'Unsupported or empty mapping.' });
      return;
    }

    const output = await runHelper({
      buttonId,
      app: appId,
      platform,
      steps,
      // Pass the last-detected tab URL and browser so execution can focus the
      // exact window/tab rather than just activating the browser application.
      activeUrl: lastAppCheck.url || '',
      activeBrowser: lastAppCheck.browser || ''
    });

    res.json({ ok: true, output });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger shortcut',
      details: error.message
    });
  }
});

loadConfig()
  .catch(() => {})
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log(`KeyPilot server running on http://localhost:${PORT}/`);
    });
    server.on('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing KeyPilot server or start this one with a different port, for example: PORT=3001 node server.js`);
        process.exit(1);
      }
      throw error;
    });
  });
