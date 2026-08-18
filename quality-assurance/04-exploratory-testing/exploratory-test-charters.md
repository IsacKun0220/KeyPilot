# Exploratory Test Charters

## EXP-001 — Sequence Editor Stress Testing

**Mission:** Investigate whether unusual editing behaviour can leave the sequence editor in an invalid or inconsistent state.

**Timebox:** 30 minutes

**Areas to Explore:**
- rapidly adding and removing steps;
- repeatedly reordering steps;
- empty sequences;
- duplicate step types;
- editing values before dragging;
- saving immediately after reordering;
- reopening edited sequences;
- very long text actions;
- repeated save/reload cycles.

**Risks:**
- stale UI state;
- incorrect ordering;
- configuration corruption;
- drag-and-drop failures;
- unsaved changes being lost.

**Findings:** To be completed during execution.

---

## EXP-002 — Application Switching

**Mission:** Explore whether KeyPilot consistently selects the correct application when users rapidly move between supported applications.

**Areas to Explore:**
- Word to Chrome to Google Docs;
- Google Docs to Excel;
- multiple browser tabs;
- unsupported browser tabs;
- fast application switching;
- automatic detection enabled/disabled;
- application switching while the mobile panel is connected.

**Findings:** To be completed during execution.
