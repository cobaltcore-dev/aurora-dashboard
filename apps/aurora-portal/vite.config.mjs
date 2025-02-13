import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import * as dotenv from "dotenv"
import process from "process"

dotenv.config()

export const DEV_PORT = process.env.DEV_PORT || "3004"
export const PORT = process.env.PORT || "4004"
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
  plugins: [react(), tsconfigPaths(), svgr()],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: {
    allowedHosts: ["aurora.ap.ws2.eu-nl-1.cloud.sap"],
    host: "0.0.0.0",
    port: parseInt(DEV_PORT),
    proxy: {
      [BFF_ENDPOINT]: {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
      },
    },
  },
})
