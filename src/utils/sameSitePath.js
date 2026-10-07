// Where sign-in may send someone afterwards: only a page on this site.
// `next` comes from the address bar, so anyone can write a sign-in link that
// sets it. "/\evil.com" and "//evil.com" look like paths, but browsers read
// them as another site, and React Router hands them to the browser as they
// are. Resolving against our own origin and comparing catches every such
// spelling. Returns the path to go to, or null.
export function sameSitePath(next, origin = window.location.origin) {
  if (typeof next !== 'string' || !next.startsWith('/')) return null;
  let url;
  try {
    url = new URL(next, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname + url.search + url.hash;
}
