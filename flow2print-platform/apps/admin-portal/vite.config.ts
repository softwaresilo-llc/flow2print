import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), "")
  };
  const proxy: Record<string, { target: string; changeOrigin: boolean; rewrite?: (path: string) => string }> = {};

  if (env.FLOW2PRINT_API_TARGET) {
    proxy["/api"] = {
      target: env.FLOW2PRINT_API_TARGET,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, "")
    };
  }

  if (env.FLOW2PRINT_DESIGNER_TARGET) {
    proxy["/designer"] = {
      target: env.FLOW2PRINT_DESIGNER_TARGET,
      changeOrigin: true
    };
  }

  return {
    plugins: [react()],
    server: {
      port: Number(env.FLOW2PRINT_ADMIN_PORT || 5177),
      proxy
    }
  };
});
