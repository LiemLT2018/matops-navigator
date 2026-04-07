import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { Md5 } from "ts-md5";
import { toast } from "sonner";
import i18n from "@/i18n";

const TOKEN_STORAGE_KEY = "matops_token";

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
  const defaults = { BASE_URL: "https://rmgapi.mobiplus.vn", DPS_CERT: "MATOPS_DEFAULT_CERT_2024" };
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

function resolveToken(): string | null {
  const fromStore = authTokenGetter?.();
  if (fromStore) return fromStore;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
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

function createApiClient(): AxiosInstance {
  const baseURL = import.meta.env.VITE_API_URL || getMatopsConfig().BASE_URL || "";

  const instance = axios.create({
    baseURL,
    timeout: 30000,
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
        if (payload.errorCode === 401) {
          toast.error(i18n.t("errors.unauthorized"));
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.location.href = "/login";
          return Promise.reject(new Error("Unauthorized"));
        }
        if (payload.errorCode !== 0) {
          return Promise.reject(new MatOpsApiError(payload.errorCode, payload.errorMessage || ""));
        }
        response.data = payload.data;
        return response;
      }

      return response;
    },
    (error) => Promise.reject(error),
  );

  return instance;
}

export const apiClient = createApiClient();
