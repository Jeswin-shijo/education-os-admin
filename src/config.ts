// Backend seam: every service function pairs a mock arm (localStorage) and a real arm
// (HTTP against the Django API), selected here. Mirrors the sibling mobile app's exact
// pattern so the two clients stay conceptually consistent.
//
// `VITE_APP_ENV` chooses which real backend to talk to (matches the mobile app's
// EXPO_PUBLIC_APP_ENV):
//   production -> VITE_PROD_API_BASE_URL    (deployed AWS server)
//   staging    -> VITE_STAGING_API_BASE_URL (Render server)
//   local      -> VITE_LOCAL_API_BASE_URL   (Docker backend on your machine)
// Set these in `.env.local` (dev) or `.env.production` (build). Default is MOCK data
// so the console runs standalone; set VITE_USE_MOCK_DATA=false to hit the backend.
// NOTE: base URLs are the bare host (no /api/v1) — src/services/http.ts adds /api/v1.

type AppEnvironment = 'local' | 'production' | 'staging';

const APP_ENV_RAW = import.meta.env.VITE_APP_ENV as string | undefined;
// const APP_ENV_RAW = import.meta.env.VITE_APP_ENV as string | undefined;
const APP_ENV: AppEnvironment =
  APP_ENV_RAW === 'local'
    ? 'local'
    : APP_ENV_RAW === 'staging'
      ? 'staging'
      : APP_ENV_RAW === 'production'
        ? 'production'
        : import.meta.env.PROD
          ? 'production'
          : 'local';

// Deployed AWS backend (plain http on port 80).
const PROD_API_BASE_URL =
  (import.meta.env.VITE_PROD_API_BASE_URL as string | undefined) ?? 'https://aicampusos.duckdns.org';

// Render / staging backend.
const STAGING_API_BASE_URL =
  (import.meta.env.VITE_STAGING_API_BASE_URL as string | undefined) ??
  'https://education-os-backend.onrender.com';

// Local Docker backend.
const LOCAL_API_BASE_URL =
  (import.meta.env.VITE_LOCAL_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000';

function baseUrlForEnv(env: AppEnvironment): string {
  if (env === 'production') return PROD_API_BASE_URL;
  if (env === 'staging') return STAGING_API_BASE_URL;
  return LOCAL_API_BASE_URL;
}

export const config = {
  /** Environment profile used to choose the backend (local | production | staging). */
  APP_ENV,
  /** When true, services resolve against the seeded localStorage mock store. */
  USE_MOCK_DATA: (import.meta.env.VITE_USE_MOCK_DATA as string | undefined) !== 'false',
  /**
   * Base URL for the real backend (bare host; http.ts appends /api/v1).
   * VITE_API_BASE_URL is an explicit override that wins over APP_ENV.
   */
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? baseUrlForEnv(APP_ENV),
  /** Local Docker backend URL. */
  LOCAL_API_BASE_URL,
  /** Deployed production (AWS) backend URL. */
  PROD_API_BASE_URL,
  /** Staging (Render-hosted) backend URL. */
  STAGING_API_BASE_URL,
};
