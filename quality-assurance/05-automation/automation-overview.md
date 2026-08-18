# Automation Overview

## Strategy

Automated tests are used where repeatability and regression protection provide clear value.

## Current Tools

- Playwright
- Node.js test runner
- JavaScript

## Existing Automated Coverage

KeyPilot currently contains a browser-level automated regression test for the sequence block editor.

The test verifies:

- the KeyPilot server can start within the test environment;
- controlled test configuration can be loaded;
- the sequence editor can be opened;
- supported sequence step types can be added;
- sequence values can be edited;
- keyboard combinations can be recorded;
- edited steps can be removed;
- removal works with both expanded and collapsed palettes;
- the original configuration is restored after execution.

## Existing Test Location

[`../../tests/setup-block-editor-dnd.test.mjs`](../../tests/setup-block-editor-dnd.test.mjs)

## Execution

```bash
npm run test:e2e
```

## Planned Automated Coverage

Future regression tests may cover:

1. configuration persistence;
2. shortcut creation;
3. shortcut editing;
4. application switching;
5. API configuration validation;
6. invalid API requests;
7. mobile connection state;
8. shortcut triggering.

Automation should focus on high-risk or frequently repeated scenarios rather than attempting to automate every manual test.
