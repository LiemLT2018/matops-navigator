import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { Md5 } from "ts-md5";
import { toast } from "sonner";
import { getErrorMessage } from "./errorDictionary";
import i18n from "@/i18n";
import type { BaseRequest, BaseResponse } from "@/types/api";

function getConfig() {
  const stored = localStorage.getItem("matops_config");
  const defaults = { BASE_URL: "https://rmgapi.mobiplus.vn", DPS_CERT: "MATOPS_DEFAULT_CERT_2024" };
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

function getBaseRequest(): BaseRequest {
  const config = getConfig();
  const time = new Date().toISOString();
  const keycert = Md5.hashStr(config.DPS_CERT + time);
  return { time, keycert, IpAddress: "127.0.0.1" };
}

export function encryptPassword(password: string): string {
  const config = getConfig();
  return Md5.hashStr(config.DPS_CERT + password);
}

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: getConfig().BASE_URL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const base = getBaseRequest();
    if (config.data && typeof config.data === "object") {
      config.data = { ...base, ...config.data };
    } else {
      config.data = base;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const data = response.data as BaseResponse;
      if (data.errorCode === 401 || data.errorCode === "401") {
        toast.error(i18n.t("errors.unauthorized"));
        localStorage.removeItem("matops_token");
        return Promise.reject(new Error("Unauthorized"));
      }
      if (data.errorCode !== 0 && data.errorCode !== "0") {
        const lang = i18n.language;
        const msg = getErrorMessage(data.errorCode, lang);
        if (msg) {
          toast.error(msg);
        } else {
          const tpl =
            lang === "en" ? `Undefined error: ${data.errorMessage}` : `Lỗi chưa định nghĩa: ${data.errorMessage}`;
          toast.error(tpl);
        }
        return Promise.reject(data);
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        toast.error(i18n.t("errors.unauthorized"));
        localStorage.removeItem("matops_token");
      } else {
        toast.error(i18n.t("errors.system"));
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const apiClient = createApiClient();
export { getConfig };
