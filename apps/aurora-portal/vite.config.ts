import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import * as dotenv from "dotenv"

dotenv.config()

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
  },
}))