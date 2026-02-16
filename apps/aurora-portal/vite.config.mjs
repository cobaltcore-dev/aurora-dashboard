import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"

import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import * as dotenv from "dotenv"
import process from "process"
import viteFastify from "@fastify/vite/plugin"
import { lingui } from "@lingui/vite-plugin"

dotenv.config()

export const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

export default defineConfig(({ mode }) => {
  const root = mode !== "test" ? "./src/client" : "./"

  return {
    root,
    build: {
      outDir: "../../dist/client", // Output directory for the client
      sourcemap: true, // Optional: Generate sourcemaps,
      emptyOutDir: true,
    },
    define: {
      BFF_ENDPOINT: JSON.stringify(BFF_ENDPOINT),
    },
    plugins: [
      tailwindcss(),
      mode !== "test" &&
        tanstackRouter({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./routes",
          generatedRouteTree: "./routeTree.gen.ts",
        }),
      mode !== "production" && viteFastify(),
      react({
        plugins: [["@lingui/swc-plugin", {}]],
      }),

      lingui(),
      svgr(),
      tsconfigPaths(),
    ],
  }
})
