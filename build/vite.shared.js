import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('..', import.meta.url));

export const sharedConfig = {
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
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },

};
