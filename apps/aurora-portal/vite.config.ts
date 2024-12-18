import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import * as dotenv from "dotenv"

dotenv.config()

const proxyPath = process.env.VITE_POLARIS_BFF_PROXY_PATH || "/polaris-bff"

export default defineConfig(() => ({
  root: "./",

  define: {
    "process.env": {},
  },

  plugins: [react(), tsconfigPaths()],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },

  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "3000"),
    proxy: {
      [proxyPath]: {
        target: process.env.POLARIS_BFF_ENDPOINT || "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/polaris-bff/, ""),
      },
    },
  },
}))
