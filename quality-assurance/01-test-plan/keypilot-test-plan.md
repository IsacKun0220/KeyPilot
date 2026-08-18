# KeyPilot Test Plan

## Purpose

The purpose of testing is to verify that KeyPilot performs its core functionality reliably across supported applications and platforms.

Testing focuses on the behaviour most important to users, including configuration, shortcut creation, shortcut execution, application switching and configuration persistence.

## Test Objectives

Testing should determine whether:

- users can create, edit and remove shortcut buttons;
- shortcut sequences are stored correctly;
- configured shortcuts execute against the intended application;
- saved configuration persists after reload;
- application switching selects the correct KeyPilot profile;
- the mobile panel can connect successfully;
- server APIs return valid responses;
- invalid requests are handled safely;
- the interface remains usable during common editing workflows;
- regression defects are detected by automated tests where practical.

## In Scope

- setup interface;
- shortcut button creation and editing;
- single-action and sequence shortcuts;
- shortcut recording;
- drag-and-drop interactions;
- configuration saving and loading;
- application switching and automatic detection;
- mobile panel connection and QR pairing;
- API behaviour;
- shortcut execution;
- Windows/macOS mapping;
- browser-based workflows.

## Out of Scope

For the initial QA portfolio:

- penetration testing;
- high-volume load testing;
- accessibility certification;
- exhaustive testing of every Microsoft Office feature;
- exhaustive testing of every browser version.

These areas may be considered as future QA work.

## Test Types

### Functional Testing
Manual validation of user-facing behaviour against expected results.

### API Testing
Validation of HTTP endpoints, response bodies, HTTP status codes and invalid input handling.

### Exploratory Testing
Time-boxed investigation of areas where scripted tests may not identify unexpected behaviour.

### Compatibility Testing
Validation across selected browsers, operating systems and target applications.

### Regression Testing
Re-running tests following changes to confirm that previously working functionality remains correct.

### Automated Testing
Repeatable automated checks using Playwright and the Node.js test runner.

## Test Environment

Example environments include:

- Windows 11
- macOS
- Google Chrome
- Microsoft Edge
- Safari
- iPhone Safari
- Microsoft Word
- Microsoft Excel
- Microsoft PowerPoint
- Google Docs
- Google Sheets
- Google Slides

Only environments actually tested should be recorded as passed.

## Severity Levels

### Critical
The application or a core function is unusable with no reasonable workaround.

### Major
Important functionality is broken or significantly impaired.

### Minor
Functionality works but contains a usability, presentation or low-impact behavioural issue.

### Trivial
Cosmetic or very low-impact issue.
