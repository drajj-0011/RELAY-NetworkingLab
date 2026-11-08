const configuredBase = (process.env.NEXT_PUBLIC_API_BASE || "").trim().replace(/\/+$/, "");

/**
 * The React client talks to whichever backend is in front of it:
 *  - same-origin Next.js route handlers (default)
 *  - the standalone Express API when NEXT_PUBLIC_API_BASE is set
 */
export function apiUrl(path) {
  return `${configuredBase}${path}`;
}

export function isUsingExpressBackend() {
  return configuredBase.length > 0;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data?.details ?? null;
    throw error;
  }

  return data;
}
