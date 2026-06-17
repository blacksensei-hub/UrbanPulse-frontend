import { adminService } from '../services/index.js';

const cache = new Map();
const pending = new Set();
const resolvers = new Map();
let timer = null;

export function requestFlags(customerId, cb) {
  if (cache.has(customerId)) { cb(cache.get(customerId)); return; }
  if (!resolvers.has(customerId)) resolvers.set(customerId, []);
  resolvers.get(customerId).push(cb);
  pending.add(customerId);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const ids = [...pending]; pending.clear();
    try {
      const data = await adminService.customer.flagsBulk(ids);
      for (const id of ids) {
        const flags = data[id] ?? [];
        cache.set(id, flags);
        (resolvers.get(id) ?? []).forEach(r => r(flags));
        resolvers.delete(id);
      }
    } catch {
      for (const id of ids) {
        cache.set(id, []);
        (resolvers.get(id) ?? []).forEach(r => r([]));
        resolvers.delete(id);
      }
    }
  }, 50);
}

export function invalidateFlags(customerId) {
  cache.delete(customerId);
}
