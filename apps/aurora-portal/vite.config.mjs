import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import * as dotenv from "dotenv"
import process from "process"
import viteFastify from "@fastify/vite/plugin"
import { lingui } from "@lingui/vite-plugin"

dotenv.config()

export const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"

export default defineConfig(({ mode }) => ({
  root: "./src/client",
  build: {
    outDir: "../../dist/client", // Output directory for the client
    sourcemap: true, // Optional: Generate sourcemaps,
    emptyOutDir: true,
  },
  define: {
    BFF_ENDPOINT: JSON.stringify(BFF_ENDPOINT),
  },
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      generatedRouteTree: "./src/client/routeTree.gen.ts",
      routesDirectory: "./src/client/routes",
    }),
    mode !== "production" && viteFastify(),
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),

    lingui(),
    svgr(),
    tsconfigPaths(),
  ],

  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
}))
