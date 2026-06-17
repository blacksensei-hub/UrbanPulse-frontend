const KEY = 'urbanpulse-recently-viewed';
const MAX = 12;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function recordView(id, slug) {
  const current = read().filter((item) => item.id !== id);
  const updated = [{ id, slug }, ...current].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // storage quota exceeded — ignore
  }
}

export function getRecentIds() {
  return read().map((item) => item.id);
}
