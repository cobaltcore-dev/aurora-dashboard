import { defineConfig } from "vite"
import process from "process"

export const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

export default defineConfig({
  root: ".",
  build: {
    outDir: "./dist/client", // Output directory for the client
    sourcemap: true, // Optional: Generate sourcemaps
  },
  define: {
    BFF_ENDPOINT: JSON.stringify(BFF_ENDPOINT),
  },
})
