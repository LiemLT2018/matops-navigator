/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Dev Vite proxy target for MatOps.Api.Host (ERP). */
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** Dev Vite proxy target for MatOps.Tenant.Api (Auth under /api/Auth). */
  readonly VITE_DEV_PROXY_TARGET_AUTH?: string;
}
