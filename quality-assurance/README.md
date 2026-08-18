# KeyPilot Quality Assurance

This directory documents the quality assurance activities carried out on **KeyPilot**, including test planning, manual testing, API testing, exploratory testing, defect reporting and automated regression testing.

The purpose of this section is to demonstrate how KeyPilot is tested as a complete software system, rather than only documenting its implementation.

## System Under Test

KeyPilot is a mobile/browser shortcut control system for Microsoft Office and Google Workspace applications.

The system consists of:

- a browser-based configuration and control interface;
- a Node.js/Express backend;
- a Go-based keyboard execution helper;
- desktop and browser application detection;
- mobile-to-desktop pairing and control;
- configurable single-action and sequence shortcuts.

## QA Areas

| Area | Description |
|---|---|
| Test Planning | Scope, objectives, risks and test approach |
| Functional Testing | Manual validation of core KeyPilot functionality |
| API Testing | Validation of server endpoints and error handling |
| Exploratory Testing | Time-boxed investigation of higher-risk areas |
| Defect Reporting | Reproducible bug reports with severity and evidence |
| Automation | Playwright and Node.js regression testing |
| Test Reporting | Summary of execution results and outstanding risks |

## Contents

- [`01-test-plan/`](./01-test-plan/) — test objectives, scope, approach and risks
- [`02-test-cases/`](./02-test-cases/) — functional and API test cases
- [`03-bug-reports/`](./03-bug-reports/) — defects found during testing
- [`04-exploratory-testing/`](./04-exploratory-testing/) — exploratory test charters
- [`05-automation/`](./05-automation/) — automated test strategy and coverage
- [`06-test-reports/`](./06-test-reports/) — execution and release summaries
- [`evidence/`](./evidence/) — screenshots, recordings and test evidence

> This is an initial draft. Test statuses and metrics should be updated only after the relevant tests have actually been executed.
