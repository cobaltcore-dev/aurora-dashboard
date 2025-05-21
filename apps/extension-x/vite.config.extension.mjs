// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: {
      entry: "src/interface/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    outDir: "dist/lib",
    sourcemap: true,
    rollupOptions: {
      external: ["fastify", "node:http"],
    },
  },
})
