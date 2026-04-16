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
  autoSwitchEnabled: true
};

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
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(normalised, null, 2));
  return normalised;
}

function mapForegroundApp(name) {
  if (!name) return null;
  if (name.includes('word')) return 'word';
  if (name.includes('excel')) return 'excel';
  if (name.includes('powerpoint') || name.includes('powerpnt')) return 'powerpoint';
  if (name.includes('docs')) return 'docs';
  if (name.includes('sheets')) return 'sheets';
  if (name.includes('slides')) return 'slides';
  if (name.includes('google chrome') || name.includes('chrome')) return runtimeState.activeApp;
  return null;
}

function detectActiveAppMac() {
  return new Promise((resolve) => {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
      end tell
      return frontApp
    `;
    require('child_process').execFile('osascript', ['-e', script], { timeout: 3000 }, (error, stdout) => {
      resolve(error ? null : mapForegroundApp(String(stdout || '').trim().toLowerCase()));
    });
  });
}

function detectActiveAppWindows() {
  return new Promise((resolve) => {
    const script = [
      '$p = Get-Process | Where-Object {$_.MainWindowTitle -and $_.MainWindowHandle -ne 0} | Sort-Object StartTime -Descending | Select-Object -First 1',
      'if ($p) { $p.ProcessName }'
    ].join('; ');
    require('child_process').execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout: 4000 }, (error, stdout) => {
      resolve(error ? null : mapForegroundApp(String(stdout || '').trim().toLowerCase()));
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
  res.json({ config: await loadConfig() });
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
  let activeApp = null;
  if (os.platform() === 'darwin') activeApp = await detectActiveAppMac();
  if (os.platform() === 'win32') activeApp = await detectActiveAppWindows();
  res.json({ activeApp: APP_IDS.includes(activeApp) ? activeApp : null });
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
      steps
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
