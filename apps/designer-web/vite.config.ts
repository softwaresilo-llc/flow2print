import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@flow2print/design-document": fileURLToPath(new URL("../../packages/design-document/src/index.ts", import.meta.url)),
      "@flow2print/ui-kit": fileURLToPath(new URL("../../packages/ui-kit/src/index.tsx", import.meta.url))
    }
  },
  server: {
    port: 4173
  }
});
