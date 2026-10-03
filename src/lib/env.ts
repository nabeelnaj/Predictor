/**
 * Frontend Environment Validation
 * Runs at app startup to ensure all required env vars are present
 * Fails fast with clear error messages if validation fails
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_PROXY_URL: string;
  VITE_APP_NAME: string;
  VITE_APP_ENV: string;
}

function validateEnv(): EnvConfig {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_PROXY_URL',
  ] as const;

  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `[FATAL] Missing required environment variables: ${missing.join(', ')}`;
    console.error(errorMsg);
    console.error('[FATAL] Check .env.example for required variables');
    
    // Render error to DOM for visibility
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #0a0a0f;
        color: #ef4444;
        font-family: system-ui, sans-serif;
        padding: 2rem;
        text-align: center;
      ">
        <div style="max-width: 600px;">
          <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Configuration Error</h1>
          <p style="margin-bottom: 1.5rem;">${errorMsg}</p>
          <p style="font-size: 0.875rem; color: #9ca3af;">
            Create a .env file from .env.example and restart the development server.
          </p>
        </div>
      </div>
    `;
    throw new Error(errorMsg);
  }

  // Validate URL formats
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const proxyUrl = import.meta.env.VITE_PROXY_URL;
  
  try {
    new URL(supabaseUrl);
    new URL(proxyUrl);
  } catch {
    const errorMsg = '[FATAL] Invalid URL format in environment variables';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Warn if using development defaults in production
  if (import.meta.env.PROD && import.meta.env.VITE_APP_ENV !== 'production') {
    console.warn('[WARN] VITE_APP_ENV is not set to "production" in production build');
  }

  return {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_PROXY_URL: proxyUrl,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'InvestPredictor',
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  };
}

// Export validated config
export const env = validateEnv();

// Type-safe accessor
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return env[key];
}