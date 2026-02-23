import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    vue(), 
    viteStaticCopy({
      targets: [
        { src: "src/manifest.json", dest: "." },
      ],
    }),
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
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
          if (assetInfo.name?.endsWith(".css")) {
            return "css/[name][extname]";
          }
          if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
            return "images/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
