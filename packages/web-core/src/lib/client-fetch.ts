

export type UnauthorizedBehavior =
  | { kind: 'redirect_to_login'; next?: string }
  | { kind: 'return_fallback' };

export type JsonObject = Record<string, unknown>;

function computeNextPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

function redirectToLogin(next?: string) {
  if (typeof window === 'undefined') return;
  const nextPath = next ?? computeNextPath();
  const encoded = encodeURIComponent(nextPath);
  window.location.href = `/login?next=${encoded}`;
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & {
    unauthorized?: UnauthorizedBehavior;
    fallback?: T;
  },
): Promise<T> {
  const { unauthorized, fallback, ...requestInit } = init ?? {};

  const res = await fetch(input, {
    cache: 'no-store',
    credentials: 'include',
    ...requestInit,
  });

  if (res.status === 401) {
    if (unauthorized?.kind === 'redirect_to_login') {
      redirectToLogin(unauthorized.next);
    }

    if (unauthorized?.kind === 'return_fallback' && fallback !== undefined) {
      return fallback;
    }

    // Default: return fallback if provided, otherwise throw.
    if (fallback !== undefined) return fallback;
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    throw new Error(`Request failed (HTTP ${res.status})`);
  }

  return (await res.json()) as T;
}

export async function mutationJson<TResponse = unknown, TBody extends JsonObject | undefined = JsonObject>(
  input: RequestInfo | URL,
  opts: {
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: TBody;
    unauthorized?: UnauthorizedBehavior;
    fallback?: TResponse;
    headers?: Record<string, string>;
  },
): Promise<TResponse> {
  const { method, body, unauthorized, fallback, headers } = opts;

  const res = await fetch(input, {
    method,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    if (!unauthorized || unauthorized.kind === 'redirect_to_login') {
      redirectToLogin(unauthorized && 'next' in unauthorized ? unauthorized.next : undefined);
    }
    if (unauthorized?.kind === 'return_fallback' && fallback !== undefined) {
      return fallback;
    }
    if (fallback !== undefined) return fallback;
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let details = '';
    try {
      const text = await res.text();
      if (text) details = `: ${text}`;
    } catch {
      // ignore
    }
    throw new Error(`Request failed (HTTP ${res.status})${details}`);
  }

  // Some endpoints respond 204 No Content
  if (res.status === 204) return undefined as TResponse;

  return (await res.json()) as TResponse;
}
