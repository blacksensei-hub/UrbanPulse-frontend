import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// GIS requires initialize() called exactly once per page load
let gsiReady = false;
const credentialHandlers = new Set();

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

  // Rules of Hooks: the !CLIENT_ID bail-out lives AFTER all hooks (bottom of the
  // component); the effects no-op instead, so hook count never varies per render.
  useEffect(() => {
    if (!CLIENT_ID) return;
    credentialHandlers.add(onCredential);
    return () => credentialHandlers.delete(onCredential);
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let animFrame;

    function tryInit() {
      if (window.google?.accounts?.id) {
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
      } else {
        animFrame = requestAnimationFrame(tryInit);
      }
    }

    tryInit();
    return () => cancelAnimationFrame(animFrame);
  }, [text]);

  if (!CLIENT_ID) return null;

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
