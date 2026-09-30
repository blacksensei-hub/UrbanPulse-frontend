import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import * as Sentry from '@sentry/react';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ThemeProvider } from './lib/ThemeContext.jsx';
import { CookieConsentProvider } from './lib/CookieConsentContext.jsx';
// Fonts are self-hosted: no third-party font servers on the first load.
import './styles/fonts.css';
import './styles/clash.css';
import './styles/globals.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <BrowserRouter>
              <CookieConsentProvider>
                <App />
              </CookieConsentProvider>
              {/* Notifications arrive as a banner from the top, in a regular
                  material with a lit edge, the way iOS presents them. */}
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: 'rgba(var(--color-bg-rgb), 0.78)',
                    backdropFilter: 'blur(22px) saturate(170%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(170%)',
                    color: 'var(--color-text)',
                    border: '1px solid color-mix(in srgb, var(--color-border) 55%, transparent)',
                    boxShadow: 'inset 0 1px 0 var(--mat-edge), var(--shadow-float)',
                    borderRadius: '18px',
                    fontWeight: 500,
                  },
                }}
              >
                {(t) => (
                  <div
                    onClick={() => t.type !== 'loading' && toast.dismiss(t.id)}
                    style={{ cursor: t.type !== 'loading' ? 'pointer' : 'default' }}
                  >
                    <ToastBar toast={t} />
                  </div>
                )}
              </Toaster>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
