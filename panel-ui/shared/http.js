export async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText || ''}`.trim());
  }
  return response.json();
}

export async function sendJson(url, { method = 'POST', body, headers = {} } = {}) {
  return getJson(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
