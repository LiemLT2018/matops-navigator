const TOKEN_KEY = "matops_token";
const USER_KEY = "matops_user";
const EXPIRES_KEY = "matops_token_expires_at";

export type MatopsAuthUser = {
  uuid: string;
  account: string;
  name: string;
  mdCompanyUuid: string;
  mdDepartmentUuid: string | null;
};

/** Token có thể nằm ở localStorage (duy trì) hoặc sessionStorage (chỉ phiên tab). */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUser(): MatopsAuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MatopsAuthUser;
  } catch {
    return null;
  }
}

/** Không có mốc hạn (phiên cũ) → không coi là hết hạn ở client; server vẫn có thể trả 401. */
export function isAccessTokenExpired(): boolean {
  try {
    const exp =
      localStorage.getItem(EXPIRES_KEY) || sessionStorage.getItem(EXPIRES_KEY);
    if (!exp) return false;
    const t = Date.parse(exp);
    if (Number.isNaN(t)) return false;
    return Date.now() >= t;
  } catch {
    return false;
  }
}

export function setAuthSession(params: {
  accessToken: string;
  user: MatopsAuthUser;
  expiresAtUtc: string;
  rememberMe: boolean;
}) {
  clearAuthSession();
  const store = params.rememberMe ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, params.accessToken);
  store.setItem(USER_KEY, JSON.stringify(params.user));
  store.setItem(EXPIRES_KEY, params.expiresAtUtc);
}

export function clearAuthSession() {
  for (const k of [TOKEN_KEY, USER_KEY, EXPIRES_KEY]) {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
