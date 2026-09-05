import { defineConfig } from "vitest/config";
import { transformWithOxc } from "vite";
import path from "path";

// Components and route files in this repo are plain `.js` files that contain
// JSX; Next's compiler handles that in the app. Vitest's default transform
// treats `.js` as plain JS, so a test that renders a component would fail to
// parse. This plugin runs the same JSX transform over our own source files
// only (never node_modules).
const jsxInJs = {
  name: "chairaise:jsx-in-js",
  enforce: "pre",
  async transform(code, id) {
    const file = id.split("?")[0];
    if (!file.endsWith(".js") || file.includes("/node_modules/")) return null;
    if (!/\/(app|components|content)\//.test(file)) return null;
    const out = await transformWithOxc(code, file, { lang: "jsx", jsx: { runtime: "automatic" } });
    return { code: out.code, map: out.map };
  },
};

export default defineConfig({
  plugins: [jsxInJs],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
