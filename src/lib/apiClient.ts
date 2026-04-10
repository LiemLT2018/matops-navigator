import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { Md5 } from "ts-md5";
import i18n from "@/i18n";
import { getAccessToken } from "@/lib/authStorage";
import { getErrorMessage } from "@/api/errorDictionary";

/** Envelope kiểu Lovable / một số gateway: `{ success, message, data }` */
export interface SuccessEnvelope<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

/** Envelope API MatOps .NET (`MatOps.Domain.Common.BaseResponse`) */
export interface MatOpsEnvelope<T = unknown> {
  errorCode: number;
  errorMessage: string;
  data: T;
}

let authTokenGetter: (() => string | null | undefined) | null = null;

export function setAuthTokenGetter(getter: () => string | null | undefined) {
  authTokenGetter = getter;
}

/** Cùng nguồn với client cũ (`matops_config` + mặc định mobiplus). */
function getMatopsConfig() {
  const stored = localStorage.getItem("matops_config");
  // Default to same-origin so dev/proxy setups work out of the box.
  // In production (e.g. lovable.dev), users should set BASE_URL in Settings.
  const defaults = { BASE_URL: "/api", DPS_CERT: "MATOPS_DEFAULT_CERT_2024" };
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

function resolveToken(): string | null {
  const fromGetter = authTokenGetter?.()?.trim();
  if (fromGetter && fromGetter !== "undefined" && fromGetter !== "null") {
    return fromGetter;
  }
  return getAccessToken();
}

function acceptLanguageHeader(): string {
  const lng = i18n.language || "vi";
  return lng.split("-")[0];
}

function dpsHeaders(): { time: string; keycert: string } {
  const config = getMatopsConfig();
  const time = new Date().toISOString();
  const keycert = Md5.hashStr(config.DPS_CERT + time);
  return { time, keycert };
}

/** Lỗi từ body khi `success === false` */
export class ApiEnvelopeError extends Error {
  readonly envelope: SuccessEnvelope<unknown>;

  constructor(envelope: SuccessEnvelope<unknown>) {
    super(envelope.message || "Request failed");
    this.name = "ApiEnvelopeError";
    this.envelope = envelope;
  }
}

/** Lỗi business từ MatOps khi `errorCode !== 0` */
export class MatOpsApiError extends Error {
  readonly errorCode: number;
  readonly errorMessage: string;

  constructor(errorCode: number, errorMessage: string) {
    super(errorMessage || `API error ${errorCode}`);
    this.name = "MatOpsApiError";
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }
}

function isSuccessEnvelope(payload: unknown): payload is SuccessEnvelope<unknown> {
  if (payload === null || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.success === "boolean" && "data" in p;
}

function isMatOpsEnvelope(payload: unknown): payload is MatOpsEnvelope<unknown> {
  if (payload === null || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.errorCode === "number";
}

function matOpsUnauthorized(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object") return false;
  const c = (payload as Record<string, unknown>).errorCode;
  return c === 401 || c === "401";
}

/** Ưu tiên errorMessage từ server; fallback errorDictionary (ApiErrorCode); cuối cùng errors.system. */
function resolveMatOpsUserMessage(errorCode: number, errorMessage: string): string {
  const trimmed = errorMessage?.trim();
  if (trimmed) return trimmed;
  const fromDict = getErrorMessage(errorCode, i18n.language);
  if (fromDict) return fromDict;
  return i18n.t("errors.system");
}

/**
 * Services gọi path dạng `api/Controller/...`. Nếu baseURL đã kết thúc bằng `/api`,
 * axios sẽ thành `.../api/api/...` (404). Bỏ một lần hậu tố `/api` khỏi base.
 */
function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/") return "/";
  const withoutApi = trimmed.replace(/\/api$/i, "");
  return withoutApi === "" ? "/" : withoutApi;
}

/**
 * Priority: VITE_API_URL env > saved matops_config.BASE_URL > fallback "/api".
 * Dùng chung lúc tạo client và khi lưu Settings (không cần reload trang).
 */
function computeApiBaseUrl(): string {
  const envBase = (import.meta.env.VITE_API_URL ?? "").trim();
  const resolved =
    envBase !== "" ? envBase : (getMatopsConfig().BASE_URL ?? "/api");
  return normalizeApiBaseUrl(resolved);
}

function isPublicAuthApiPath(url: string | undefined): boolean {
  if (!url) return false;
  return /(^|\/)api\/auth\//i.test(url);
}

const crossOriginBaseWarned = new Set<string>();

function createApiClient(): AxiosInstance {
  const baseURL = computeApiBaseUrl();

  const instance = axios.create({
    baseURL,
    timeout: 30000,
    // MatOps API dùng JWT Bearer; không cần gửi cookie cross-site.
    // withCredentials=true sẽ bị browser chặn nếu server trả `Access-Control-Allow-Origin: *`.
    withCredentials: false,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { time, keycert } = dpsHeaders();
    config.headers.set("X-Dps-Time", time);
    config.headers.set("X-Dps-Keycert", keycert);
    config.headers.set("Accept-Language", acceptLanguageHeader());

    const token = resolveToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else if (
      import.meta.env.DEV &&
      !isPublicAuthApiPath(config.url) &&
      typeof config.url === "string" &&
      /^api\//i.test(config.url)
    ) {
      const full = `${config.baseURL ?? ""}${config.url ?? ""}`;
      // eslint-disable-next-line no-console
      console.warn(
        "[api] Thiếu JWT (Authorization) — request sẽ 401 nếu endpoint cần đăng nhập:",
        full,
      );
    }

    if (import.meta.env.DEV && typeof window !== "undefined") {
      const b = (config.baseURL ?? "").trim();
      if (b.startsWith("http") && !crossOriginBaseWarned.has(b)) {
        try {
          if (new URL(b).origin !== window.location.origin) {
            crossOriginBaseWarned.add(b);
            // eslint-disable-next-line no-console
            console.warn(
              "[api] Đang gọi API cross-origin (%s). JWT phải do đúng host này cấp (cùng SigningKey). Dev: đặt BASE_URL=/api và VITE_DEV_PROXY_TARGET trỏ tới API.",
              b,
            );
          }
        } catch {
          /* ignore invalid baseURL */
        }
      }
    }

    const method = config.method?.toLowerCase();
    if (method === "post" || method === "put" || method === "patch") {
      const baseBody = {
        time,
        keycert,
        IpAddress: "127.0.0.1",
      };
      const data = config.data;
      if (data instanceof FormData) {
        /* skip */
      } else if (data && typeof data === "object") {
        config.data = { ...baseBody, ...data };
      } else {
        config.data = baseBody;
      }
    }

    if (import.meta.env.DEV) {
      const m = (config.method ?? "get").toUpperCase();
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      // Helpful when debugging "button click doesn't call API"
      // eslint-disable-next-line no-console
      console.debug("[api]", m, url, { params: config.params, data: config.data });
    }

    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const payload = response.data;

      if (isSuccessEnvelope(payload)) {
        if (!payload.success) {
          return Promise.reject(new ApiEnvelopeError(payload));
        }
        response.data = payload.data;
        return response;
      }

      if (isMatOpsEnvelope(payload)) {
        if (payload.errorCode !== 0) {
          const msg = resolveMatOpsUserMessage(payload.errorCode, payload.errorMessage || "");
          return Promise.reject(new MatOpsApiError(payload.errorCode, msg));
        }
        response.data = payload.data;
        return response;
      }

      return response;
    },
    (error) => {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 401 || matOpsUnauthorized(data)) {
        const p = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : {};
        const codeRaw = p.errorCode;
        const code =
          typeof codeRaw === "number"
            ? codeRaw
            : codeRaw === "401"
              ? 401
              : 401;
        const em = typeof p.errorMessage === "string" ? p.errorMessage : "";
        const msg = resolveMatOpsUserMessage(code, em);
        return Promise.reject(new MatOpsApiError(code, msg));
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const apiClient = createApiClient();

/** Cập nhật baseURL sau khi đổi `matops_config` trong Settings (VITE_API_URL vẫn cần restart dev server). */
export function syncApiClientBaseUrl() {
  apiClient.defaults.baseURL = computeApiBaseUrl();
}
