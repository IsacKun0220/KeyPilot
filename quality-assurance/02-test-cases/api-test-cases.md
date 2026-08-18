# API Test Cases

## API-CONFIG-001 — Retrieve Configuration

**Endpoint:** `GET /api/config`  
**Expected Status:** `200 OK`  
**Status:** Not Run

**Expected Result:**
- The response contains a `config` object.
- The response contains `configVersion`.

---

## API-CONFIG-002 — Update Configuration

**Endpoint:** `PUT /api/config`  
**Expected Status:** `200 OK`  
**Status:** Not Run

**Test:** Send a valid configuration payload.

**Expected Result:**
- The configuration is accepted.
- The response contains the normalised configuration.
- A subsequent `GET /api/config` returns the updated configuration.

---

## API-TRIGGER-001 — Trigger Valid Shortcut

**Endpoint:** `POST /trigger`  
**Priority:** Critical  
**Status:** Not Run

**Expected Result:**
- The configured shortcut is resolved.
- The helper receives the expected execution steps.
- The API returns a successful response.

---

## API-TRIGGER-002 — Trigger Invalid Shortcut

**Endpoint:** `POST /trigger`  
**Status:** Not Run

**Example Request:**

```json
{
  "app": "word",
  "platform": "win",
  "buttonId": "invalid-button"
}
```

**Expected Result:**
- The request is rejected.
- HTTP status is `400`.
- A meaningful error message is returned.
