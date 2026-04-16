# KeyPilot 2.0

KeyPilot is a mobile/browser shortcut panel for office productivity with a modular vanilla JS front end, a Node.js server, and a Go helper for shortcut execution.

## Structure

- `panel-ui/`
  Setup UI, panel runtime, shared schema, shared icons, and Tailwind-owned CSS.
- `server/`
  Express server, config loading/saving, runtime resolution, and helper routing.
- `helper/`
  Go helper that executes resolved steps.

## First-Time Setup

From the repo root:

```bash
npm run setup
```

That bootstrap flow:

1. installs `server` dependencies
2. installs `panel-ui` dependencies
3. builds `panel-ui/styles/app.css`
4. builds the Go helper binary

## Running Locally

Start the server:

```bash
cd server
node server.js
```

Open:

- `http://localhost:3000/setup.html`
- `http://localhost:3000/panel.html`

## UI CSS Workflow

Tailwind is owned by `panel-ui/`.

Useful root commands:

```bash
npm run ui:install
npm run ui:build:css
npm run ui:watch:css
```

Important files:

- source entry: `panel-ui/styles/app.tailwind.css`
- built stylesheet: `panel-ui/styles/app.css`

## Button Model

Buttons use an explicit step-based schema:

- `actionType`: `single` or `sequence`
- `scope.apps`
- `scope.platforms`
- `mappings[appId][platform].steps`

Supported step types:

- `keyCombo`
- `keyPress`
- `text`
- `delay`
- `repeatKeyPress`

## Icons

Icons now use shared Lucide-style definitions and `iconId` only.

- definitions: `panel-ui/shared/icons/definitions.js`
- icon API: `panel-ui/shared/icons/index.js`

Legacy icon glyph references are no longer used at runtime.
