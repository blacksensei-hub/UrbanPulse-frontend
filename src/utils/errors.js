// The server's reason for a failed request, or the given fallback. Thrown errors
// arrive as { error }; a few auth routes reply { message }. A 500 body is
// usually a raw exception (a database error, a TypeError), so it never reaches
// the screen; deliberate 502/503 replies ("Sign-ups aren't open yet") still do.
export function getServerMessage(err, fallback) {
  const res = err?.response;
  if (!res || res.status === 500) return fallback;
  const reason = res.data?.error ?? res.data?.message;
  return typeof reason === 'string' && reason ? reason : fallback;
}

// Returns a friendly message for network/offline failures, otherwise the server's
// message (if any) or the given fallback.
export function getErrorMessage(err, fallback) {
  if (!err?.response) {
    return "You seem to be offline — we'll keep your cart safe.";
  }
  return getServerMessage(err, fallback);
}
