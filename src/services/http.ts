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

function extractError(data: unknown): { message: string; fieldErrors?: Record<string, string[]> } {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return { message: obj.detail };
    const fieldErrors: Record<string, string[]> = {};
    let first: string | undefined;
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val)) {
        fieldErrors[key] = val.map(String);
        if (!first) first = `${key}: ${val[0]}`;
      }
    }
    if (first) return { message: first, fieldErrors };
  }
  return { message: 'Something went wrong. Please try again.' };
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
};

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
    const { message, fieldErrors } = extractError(envelope?.data);
    throw new ApiError(message, res.status, fieldErrors);
  }

  const data = envelope?.data;
  if (data && typeof data === 'object' && 'results' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).results as T;
  }
  return data as T;
}

export const http = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) => request<T>(path, { ...opts, method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, 'method' | 'body' | 'form'>) =>
    request<T>(path, { ...opts, method: 'POST', form }),
};
