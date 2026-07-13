import axios from 'axios';
import { hasSessionHint, clearSessionHint } from '../utils/sessionHint.js';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

// Attach a guest session id to anonymous cart requests
function getSessionId() {
  let id = localStorage.getItem('urbanpulse-sid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('urbanpulse-sid', id);
  }
  return id;
}

api.interceptors.request.use((config) => {
  config.headers['X-Session-Id'] = getSessionId();
  const viewAsToken = localStorage.getItem('urbanpulse-view-as-token');
  if (viewAsToken) config.headers['X-View-As-Token'] = viewAsToken;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url.includes('/auth/') &&
      hasSessionHint()
    ) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (refreshErr) {
        refreshing = null;
        // Only a definitive rejection (refresh token expired/invalid) should
        // clear the hint — a network/5xx hiccup on the refresh call shouldn't.
        if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) clearSessionHint();
      }
    }
    return Promise.reject(error);
  }
);
