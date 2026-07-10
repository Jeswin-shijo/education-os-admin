// Backend seam: every service function pairs a mock arm (localStorage) and a real arm
// (HTTP against the Django API), selected here. Mirrors the sibling mobile app's exact
// pattern so the two clients stay conceptually consistent.
//
// Default is MOCK so the console runs standalone with seeded demo data. To go live against
// the Django backend, set `VITE_USE_MOCK_DATA=false` (and optionally `VITE_API_BASE_URL`)
// in a `.env.local` — no code changes needed; every page already has a real HTTP arm.
export const config = {
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'https://education-os-backend.onrender.com',
  USE_MOCK_DATA: (import.meta.env.VITE_USE_MOCK_DATA as string | undefined) !== 'false',
};
