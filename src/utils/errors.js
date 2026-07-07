// Returns a friendly message for network/offline failures, otherwise the server's
// message (if any) or the given fallback.
export function getErrorMessage(err, fallback) {
  if (!err?.response) {
    return "You seem to be offline — we'll keep your cart safe.";
  }
  return err.response?.data?.message ?? fallback;
}
