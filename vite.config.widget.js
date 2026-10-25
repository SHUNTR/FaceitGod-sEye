import { sharedConfig } from './build/vite.shared.js';
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  ...sharedConfig,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      input: {
        widget: resolve(__dirname, "src/js/widget.js"),
      },
      output: {
        entryFileNames: "js/[name].js",
        format: "iife",
      },
    },
  },
});
