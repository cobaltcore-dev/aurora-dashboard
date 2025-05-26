import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: {
      entry: "src/bff/index.ts",
      formats: ["cjs"],
      fileName: (format) => `index.js`,
    },
    outDir: "dist/bff",
    sourcemap: true,
    rollupOptions: {
      external: ["fastify", "node:http", /^\.\.\/client.*/, /^\.\.\/bff.*/, /^@trpc\/.*/, "react-dom/client", "react"],
    },
  },
})
