import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// GIS requires initialize() called exactly once per page load
let gsiReady = false;
const credentialHandlers = new Set();

// Google's script is ~100KB and used only where this button renders, so it's
// fetched here on demand rather than from index.html on every page, where it
// competed with the first paint on slow connections.
let gsiScript = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScript) {
    gsiScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gsiScript = null; reject(new Error('gsi failed to load')); };
      document.head.appendChild(s);
    });
  }
  return gsiScript;
}

function getOrInitGSI() {
  if (gsiReady) return;
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response) => {
      if (response.credential) {
        credentialHandlers.forEach((fn) => fn(response.credential));
      }
    },
    error_callback: () => {
      toast.error('Google sign-in is unavailable. Use email instead.');
    },
  });
  gsiReady = true;
}

export default function GoogleSignInButton({ onCredential, text = 'signin_with' }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Rules of Hooks: the !CLIENT_ID bail-out lives AFTER all hooks (bottom of the
  // component); the effects no-op instead, so hook count never varies per render.
  useEffect(() => {
    if (!CLIENT_ID) return;
    credentialHandlers.add(onCredential);
    return () => credentialHandlers.delete(onCredential);
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGsi().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      getOrInitGSI();
      if (containerRef.current) {
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          shape: 'pill',
          size: 'large',
          text,
          locale: 'en',
          width: containerRef.current.offsetWidth || 400,
        });
      }
      setReady(true);
    }).catch(() => {
      // Blocked or offline: drop the button rather than pulse forever.
      // Email sign-in on the same page still works.
      if (!cancelled) setFailed(true);
    });

    return () => { cancelled = true; };
  }, [text]);

  if (!CLIENT_ID || failed) return null;

  return (
    <div className="w-full">
      {!ready && (
        <div className="h-11 w-full animate-pulse rounded-full bg-border" aria-hidden="true" />
      )}
      <div
        ref={containerRef}
        className={ready ? 'w-full' : 'sr-only'}
        aria-label="Sign in with Google"
      />
    </div>
  );
}
