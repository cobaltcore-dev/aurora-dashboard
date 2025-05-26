// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: {
      entry: "src/extension/index.ts",
      formats: ["es"], // Build both formats
      fileName: (format) => `index.js`,
    },
    outDir: "dist/extension",
    sourcemap: true,
    rollupOptions: {
      external: [/^\.\.\/client.*/, /^\.\.\/bff.*/, /^@trpc\/.*/],
    },
  },
})
