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
        faceit: resolve(__dirname, "src/js/faceit.js"),
      },
      output: {
        entryFileNames: "js/[name].js",
        format: "iife",
      },
    },
  },
});
