import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely handle transient Firebase Auth network errors (such as sandbox/iframe origin or offline mode)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason?.name === 'FirebaseError' ||
    reason?.code?.startsWith?.('auth/') ||
    (typeof reason?.message === 'string' &&
      (reason.message.includes('auth/network-request-failed') ||
        reason.message.includes('network-request-failed') ||
        reason.message.includes('the client is offline')))
  ) {
    console.warn('Silenced transient Firebase Auth offline/network error:', reason?.message || reason);
    event.preventDefault();
  }
});

// Register Service Worker for offline persistence, background sync & PWA installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Automatically check for new updates from server whenever opened
        reg.update().catch(() => {});

        // Listen for new worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New app version detected, reloading to apply updates...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.debug('Service Worker registration note:', err);
      });
  });

  // Reload when controller changes
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

