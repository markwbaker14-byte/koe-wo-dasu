// Client-side wrapper for the /api/analyze proxy. Replaces the direct
// Anthropic call that used to live in src/App.jsx. See
// specs/api-key-security-fix.md §5.

export async function callAPI(pdfBase64, memo = "", depth, grade, prevSession = null) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, depth, grade, prevSession, memo }),
  });

  if (!res.ok) {
    let errBody;
    try { errBody = await res.json(); } catch { errBody = {}; }
    throw new Error(errBody.error || `API_ERROR: ${res.status}`);
  }

  return res.json();
}
