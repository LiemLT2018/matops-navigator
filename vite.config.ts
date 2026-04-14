import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** ERP (MatOps.Api.Host), mặc định http://localhost:5145 */
  const proxyTargetErp = env.VITE_DEV_PROXY_TARGET || "http://localhost:5145";
  /**
   * Auth: mặc định **cùng** ERP để chỉ cần một backend khi dev (tránh 500 khi Tenant chưa bật).
   * Set `VITE_DEV_PROXY_TARGET_AUTH=http://localhost:5079` khi chạy MatOps.Tenant.Api (split như production).
   */
  const proxyTargetAuth =
    env.VITE_DEV_PROXY_TARGET_AUTH?.trim() || proxyTargetErp;
  /** API HTTPS local (vd. https://localhost:7145) thường dùng chứng tự ký — proxy phải secure: false. */
  const localDevHttps = (u: string) =>
    /^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/i.test(u.trim());

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api/Auth": {
          target: proxyTargetAuth,
          changeOrigin: true,
          secure:
            proxyTargetAuth.startsWith("https://") &&
            !localDevHttps(proxyTargetAuth),
        },
        "/api": {
          target: proxyTargetErp,
          changeOrigin: true,
          secure:
            proxyTargetErp.startsWith("https://") &&
            !localDevHttps(proxyTargetErp),
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
  };
});
