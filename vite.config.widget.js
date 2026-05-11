import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@constants": resolve(__dirname, "src/constants"),
      "@shared": resolve(__dirname, "src/components/shared"),
      "@features": resolve(__dirname, "src/components/features"),
      "@entites": resolve(__dirname, "src/components/entites"),
      "@widgets": resolve(__dirname, "src/components/widgets"),
      "@components": resolve(__dirname, "src/components"),
      "@utils": resolve(__dirname, "src/utils"),
      "@api": resolve(__dirname, "src/api"),
      src: resolve(__dirname, "src"),
    },
  },
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
