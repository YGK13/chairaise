import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  // Components are plain .js files containing JSX (Next's compiler handles that
  // in the app); tell esbuild to do the same when a test renders one.
  esbuild: { loader: "jsx", include: /\.[jt]sx?$/, exclude: [], jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
