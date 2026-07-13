import { config } from '../config';
import * as tokenStore from './tokenStore';

export class ApiError extends Error {
  status?: number;
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, status?: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Pull a human message + per-field errors out of an error response. The backend's
// standard error envelope is `{ status:'error', message, errors:[{field, message}] }`
// (no `data` key on errors), so we read `message`/`errors` off the envelope itself.
// Legacy DRF shapes (`{ detail }`, `{ field: [msgs] }`) are still handled as a
// fallback for any endpoint that hasn't been wrapped in the envelope.
function extractError(envelope: unknown): { message: string; fieldErrors?: Record<string, string[]> } {
  if (!envelope || typeof envelope !== 'object') return { message: GENERIC_ERROR };
  const obj = envelope as Record<string, unknown>;

  const fieldErrors: Record<string, string[]> = {};

  // Standard envelope: errors: [{ field, message }, ...]. Skip DRF's non-field
  // markers (`detail`, `code`, `non_field_errors`) — those aren't form fields;
  // their text is already surfaced via the top-level `message`.
  if (Array.isArray(obj.errors)) {
    const NON_FIELD = new Set(['detail', 'code', 'non_field_errors', 'token_class', 'token_type', 'message']);
    for (const e of obj.errors) {
      if (e && typeof e === 'object') {
        const field = (e as Record<string, unknown>).field;
        const msg = (e as Record<string, unknown>).message;
        if (typeof field === 'string' && field && !NON_FIELD.has(field) && msg != null) {
          (fieldErrors[field] ??= []).push(String(msg));
        }
      }
    }
  }

  // Legacy fallbacks when there's no standard envelope message.
  if (typeof obj.message !== 'string' || !obj.message) {
    if (typeof obj.detail === 'string') return { message: obj.detail };
    let first: string | undefined;
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val) && key !== 'errors' && val.every((v) => typeof v === 'string')) {
        fieldErrors[key] = (val as string[]).map(String);
        if (!first) first = `${key}: ${val[0]}`;
      }
    }
    if (first) return { message: first, fieldErrors };
  }

  const message = typeof obj.message === 'string' && obj.message ? obj.message : GENERIC_ERROR;
  return Object.keys(fieldErrors).length ? { message, fieldErrors } : { message };
}

// The Django backend registers every router with `trailing_slash=False` and all
// its explicit APIView paths are slash-less too, so a trailing slash 404s. Several
// call sites (and the API doc) still spell endpoints as `/departments/`, `/x/<id>/`,
// `/subjects/?semester=…`. Normalize here in one place: drop a trailing slash,
// including one sitting just before the query string.
function normalizePath(path: string): string {
  const qIndex = path.indexOf('?');
  const p = qIndex === -1 ? path : path.slice(0, qIndex);
  const query = qIndex === -1 ? '' : path.slice(qIndex);
  const stripped = p.length > 1 ? p.replace(/\/+$/, '') : p;
  return stripped + query;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.getRefreshToken();
  if (!refresh) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${config.API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = await res.json().catch(() => null);
        const data = json?.data ?? json;
        if (data?.access_token) {
          tokenStore.setTokens(data.access_token, data.refresh_token ?? refresh);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean; // default true
  // When true, return the whole envelope `data` (e.g. `{results, pagination}`)
  // instead of auto-unwrapping `data.results`. Used by `getPaginated`.
  raw?: boolean;
};

export type Pagination = { count: number; page: number; limit: number; totalPages: number };
export type Paginated<T> = { results: T[]; pagination: Pagination };

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, form, auth = true } = options;
  const headers: Record<string, string> = {};
  if (!form) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${config.API_BASE_URL}${normalizePath(path)}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(`Could not reach the server at ${config.API_BASE_URL}. Is the backend running?`);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // empty body, fine for 204s
  }

  if (res.status === 401 && auth && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
  }

  const envelope = json as { status?: string; data?: unknown } | null;
  if (!res.ok || envelope?.status === 'error') {
    // Error envelopes carry the message/errors at the top level (no `data` key),
    // so extract from the whole envelope — not `envelope.data`, which is undefined
    // here and would collapse every error to a generic "Something went wrong".
    const { message, fieldErrors } = extractError(envelope);
    throw new ApiError(message, res.status, fieldErrors);
  }

  const data = envelope?.data;
  if (!options.raw && data && typeof data === 'object' && 'results' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).results as T;
  }
  return data as T;
}

/** Build a query string from params, dropping empty/undefined values. */
function toQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export const http = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) => request<T>(path, { ...opts, method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) =>
    request<T>(path, { ...opts, method: 'POST', form }),
  patchForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) =>
    request<T>(path, { ...opts, method: 'PATCH', form }),
  /**
   * GET a paginated list, returning both `results` and normalized `pagination`
   * ({count, page, limit, totalPages}). `params` (page/limit/filters) is appended
   * as a query string. Falls back to a single-page shape if the endpoint isn't
   * paginated (e.g. returns a bare array).
   */
  getPaginated: async <T>(
    path: string,
    params?: Record<string, string | number | undefined | null>,
  ): Promise<Paginated<T>> => {
    const sep = path.includes('?') ? '&' : '';
    const qs = toQuery(params);
    const full = qs ? `${path}${sep}${qs.slice(sep ? 1 : 0)}` : path;
    const data = await request<
      { results?: T[]; pagination?: { count?: number; page?: number; limit?: number; total_pages?: number } } | T[]
    >(full, { method: 'GET', raw: true });
    if (Array.isArray(data)) {
      return { results: data, pagination: { count: data.length, page: 1, limit: data.length || 25, totalPages: 1 } };
    }
    const results = data.results ?? [];
    const p = data.pagination ?? {};
    return {
      results,
      pagination: {
        count: p.count ?? results.length,
        page: p.page ?? 1,
        limit: p.limit ?? 25,
        totalPages: p.total_pages ?? 1,
      },
    };
  },
  /**
   * GET every page of a collection and return the flattened array. Backend list
   * endpoints are paginated (page_size 25, max 100) and `get` only ever sees page 1,
   * so any list used to populate a dropdown or resolve an id → name MUST page through
   * the rest here — otherwise entities beyond the first page render as raw ids.
   * Non-paginated endpoints (bare array) resolve in a single request via the
   * getPaginated array fallback (totalPages = 1).
   */
  getAll: async <T>(
    path: string,
    params?: Record<string, string | number | undefined | null>,
  ): Promise<T[]> => {
    const first = await http.getPaginated<T>(path, { ...params, page: 1, limit: 100 });
    const all = [...first.results];
    for (let page = 2; page <= first.pagination.totalPages; page++) {
      const next = await http.getPaginated<T>(path, { ...params, page, limit: 100 });
      all.push(...next.results);
    }
    return all;
  },
};
