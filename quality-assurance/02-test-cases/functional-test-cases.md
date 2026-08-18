# Functional Test Cases

## TC-FUNC-001 — Load Setup Interface

**Priority:** High  
**Status:** Not Run

**Preconditions:** KeyPilot server is running.

**Steps:**
1. Navigate to the KeyPilot setup page.
2. Wait for the page to load.

**Expected Result:**
- The setup interface loads successfully.
- No blocking error is displayed.
- Existing configuration is visible.

---

## TC-FUNC-002 — Create a Single-Action Shortcut

**Priority:** High  
**Status:** Not Run

**Preconditions:**
- Setup interface is open.
- An application profile is selected.

**Steps:**
1. Select an empty shortcut slot.
2. Enter a shortcut name.
3. Select or record a key combination.
4. Complete the creation process.
5. Save the configuration.

**Expected Result:**
- A new shortcut button is created.
- The correct label is displayed.
- The shortcut appears in the selected slot.
- Configuration can be saved successfully.

---

## TC-FUNC-003 — Create a Sequence Shortcut

**Priority:** High  
**Status:** Not Run

**Steps:**
1. Open an empty shortcut slot.
2. Create a sequence shortcut.
3. Add multiple sequence steps.
4. Configure each step.
5. Save the shortcut.

**Expected Result:**
- All configured steps are stored.
- The sequence appears as a shortcut button.
- Reopening the button displays the saved sequence correctly.

---

## TC-FUNC-004 — Record a Keyboard Combination

**Priority:** High  
**Status:** Not Run

**Steps:**
1. Add a key-combination step.
2. Start shortcut recording.
3. Press a supported key combination.
4. Stop recording.

**Expected Result:**
- The captured keys are displayed correctly.
- The shortcut is stored in the intended order.
- No additional unintended keys are captured.

---

## TC-FUNC-005 — Remove an Edited Sequence Step

**Priority:** High  
**Status:** Automated

**Steps:**
1. Add a sequence step.
2. Modify the step.
3. Drag the step back to the palette.
4. Repeat with the palette expanded.
5. Repeat with the palette collapsed.

**Expected Result:**
- The edited step is removed successfully in both states.
- The remaining sequence remains valid.

**Automation:** [`../../tests/setup-block-editor-dnd.test.mjs`](../../tests/setup-block-editor-dnd.test.mjs)

---

## TC-FUNC-006 — Configuration Persistence

**Priority:** Critical  
**Status:** Not Run

**Steps:**
1. Modify the current KeyPilot configuration.
2. Save the configuration.
3. Refresh the setup page.
4. Restart the KeyPilot server.
5. Reopen the application.

**Expected Result:**
- Saved configuration remains available.
- Button mappings are unchanged.
- Selected profiles and application configuration remain valid.

---

## TC-FUNC-007 — Switch Active Application

**Priority:** High  
**Status:** Not Run

**Steps:**
1. Select Microsoft Word.
2. Observe the displayed shortcut set.
3. Switch to Google Docs.
4. Observe the displayed shortcut set.

**Expected Result:**
- KeyPilot changes to the correct application configuration.
- Buttons associated with the newly selected application are displayed.
