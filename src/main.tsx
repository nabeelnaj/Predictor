import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Initialize environment validation at startup (must be first import)
import './lib/env';
import App from './App.tsx';
import './index.css';

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    event.preventDefault(); // Prevent default browser behavior
  });

  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);