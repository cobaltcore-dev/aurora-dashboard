import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import * as dotenv from "dotenv"

dotenv.config()

const proxyPath = "/polaris-bff"

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
    port: parseInt(process.env.PORT || "3003"),
    proxy: {
      [proxyPath]: {
        target: process.env.POLARIS_BFF_ENDPOINT || "http://localhost:4003",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/polaris-bff/, ""),
      },
    },
  },
}))
