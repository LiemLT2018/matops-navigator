const TOKEN_KEY = "matops_token";
const USER_KEY = "matops_user";
const EXPIRES_KEY = "matops_token_expires_at";

export type AllowedCompany = {
  uuid: string;
  code: string;
  name: string;
  isDefault?: boolean;
};

export type MatopsAuthUser = {
  uuid: string;
  account: string;
  name: string;
  mdCompanyUuid: string;
  mdDepartmentUuid: string | null;
  /** Companies the user may switch to (when using session+switch-tenant API). */
  allowedCompanies?: AllowedCompany[];
};

/** Token có thể nằm ở localStorage (duy trì) hoặc sessionStorage (chỉ phiên tab). */
export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
    if (raw == null) return null;
    const t = raw.trim();
    // Từng lưu nhầm undefined/null thành chuỗi → không coi là JWT hợp lệ.
    if (t === "" || t === "undefined" || t === "null") return null;
    return t;
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

/**
 * UUID công ty để gửi query `mdCompanyUuid` (list đối tác, BOM, …).
 * Hỗ trợ payload cũ PascalCase và fallback `allowedCompanies` khi user thiếu `mdCompanyUuid`.
 */
export function resolveMdCompanyUuidForApi(): string | undefined {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return undefined;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const fromRoot =
      (typeof o.mdCompanyUuid === 'string' && o.mdCompanyUuid.trim() !== '')
        ? o.mdCompanyUuid.trim()
        : (typeof o.MdCompanyUuid === 'string' && o.MdCompanyUuid.trim() !== '')
          ? o.MdCompanyUuid.trim()
          : '';
    if (fromRoot) return fromRoot;

    const list = (o.allowedCompanies ?? o.AllowedCompanies) as unknown;
    if (!Array.isArray(list) || list.length === 0) return undefined;

    const asRow = (x: unknown) => x as Record<string, unknown>;
    const def = list.find((c) => {
      const x = asRow(c);
      return x.isDefault === true || x.IsDefault === true;
    });
    if (def) {
      const x = asRow(def);
      const u = x.uuid ?? x.Uuid;
      if (typeof u === 'string' && u.trim() !== '') return u.trim();
    }
    const first = asRow(list[0]);
    const u = first.uuid ?? first.Uuid;
    return typeof u === 'string' && u.trim() !== '' ? u.trim() : undefined;
  } catch {
    return undefined;
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

/** True if the access token is stored in localStorage (Remember me). */
export function usesPersistentStorage(): boolean {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

/** Update active company after Switch Tenant without re-login. */
export function updateActiveCompanyInSession(mdCompanyUuid: string) {
  const token = getAccessToken();
  const user = getAuthUser();
  if (!token || !user) return;

  const exp =
    localStorage.getItem(EXPIRES_KEY) || sessionStorage.getItem(EXPIRES_KEY) || "";
  const rememberMe = usesPersistentStorage();

  const next: MatopsAuthUser = {
    ...user,
    mdCompanyUuid,
  };

  setAuthSession({
    accessToken: token,
    user: next,
    expiresAtUtc: exp,
    rememberMe,
  });
}

export function mergeAllowedCompaniesIntoSession(companies: AllowedCompany[]) {
  const token = getAccessToken();
  const user = getAuthUser();
  if (!token || !user) return;

  const exp =
    localStorage.getItem(EXPIRES_KEY) || sessionStorage.getItem(EXPIRES_KEY) || "";
  const rememberMe = usesPersistentStorage();

  setAuthSession({
    accessToken: token,
    user: { ...user, allowedCompanies: companies },
    expiresAtUtc: exp,
    rememberMe,
  });
}
