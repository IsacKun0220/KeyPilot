export async function postTrigger(payload) {
  const response = await fetch('/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let details = 'Trigger failed';
    try {
      const body = await response.json();
      details = body?.details || body?.error || details;
    } catch (_) {
      // Fall back to a generic message when the server has no JSON body.
    }
    throw new Error(details);
  }
  return response.json();
}
