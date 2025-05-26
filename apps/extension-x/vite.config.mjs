// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig({
  root: "./src",

  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
})
