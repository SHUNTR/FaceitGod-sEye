import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: "src/manifest.json", dest: "." },
        { src: "src/fonts/*.{ttf,woff,woff2}", dest: "fonts" },
      ],
    }),
  ],
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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/js/background.js"),
        popup: resolve(__dirname, "src/js/popup.js"),
        main: resolve(__dirname, "src/sass/main.scss"),
      },
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "css/[name][extname]";
          if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|ico)$/))
            return "images/[name][extname]";
          if (assetInfo.name?.match(/\.(ttf|woff|woff2|eot|otf)$/)) {
            return "fonts/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
