// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig({
  root: "./src/standalone",

  build: {
    outDir: "../../dist/dev",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
})
