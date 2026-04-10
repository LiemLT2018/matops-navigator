import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** Backend cho dev: mặc định MatOps.Api.Host local. Dùng https://… khi không bật BE local — tránh CORS (không set VITE_API_URL trỏ thẳng remote). */
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:5145";
  /** API HTTPS local (vd. https://localhost:7145) thường dùng chứng tự ký — proxy phải secure: false. */
  const localDevHttps =
    /^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/i.test(proxyTarget.trim());

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxyTarget.startsWith("https://") && !localDevHttps,
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
