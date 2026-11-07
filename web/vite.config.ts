import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import stylex from "@stylexjs/unplugin";

// `npm run build:demo` makes the static GitHub Pages version: hash routes and relative paths, no backend.
export default defineConfig({
  base: process.env.VITE_DEMO === "1" ? "./" : "/",
  plugins: [stylex.vite(), solid()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: false } },
  },
});
