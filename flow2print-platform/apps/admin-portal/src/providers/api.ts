const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`);
const browserOrigin = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}` : "";

const apiBase = import.meta.env.VITE_FLOW2PRINT_API_URL
  ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_API_URL)
  : browserOrigin
    ? `${browserOrigin}:3000`
    : "";

const designerBase = import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL
  ? trimTrailingSlash(import.meta.env.VITE_FLOW2PRINT_DESIGNER_URL)
  : browserOrigin
    ? `${browserOrigin}:5173`
    : "";

export const API_URL = apiBase;
export const DESIGNER_URL = designerBase;
export const ADMIN_SESSION_KEY = "flow2print.admin.session";

export const readSessionToken = () => window.localStorage.getItem(ADMIN_SESSION_KEY);

export const writeSessionToken = (token: string | null) => {
  if (token) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, token);
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}${ensureLeadingSlash(path)}`;
};

export const resolveDesignerUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (DESIGNER_URL) {
    return `${DESIGNER_URL}${ensureLeadingSlash(path)}`;
  }

  return ensureLeadingSlash(path);
};

export const buildHeaders = (headers?: HeadersInit) => {
  const next = new Headers(headers ?? {});
  const token = readSessionToken();

  if (token) {
    next.set("Authorization", `Bearer ${token}`);
  }

  if (!next.has("Content-Type")) {
    next.set("Content-Type", "application/json");
  }

  return next;
};

export const requestJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(resolveApiUrl(input), {
    ...init,
    headers: buildHeaders(init?.headers)
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      message = payload.message ?? payload.code ?? message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
