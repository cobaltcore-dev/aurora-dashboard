import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "tailwindcss"
import autoprefixer from "autoprefixer"
import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import dts from "vite-plugin-dts"
import * as dotenv from "dotenv"
import process from "process"

dotenv.config()

export const DEV_PORT = process.env.DEV_PORT || "3005"
export const PORT = process.env.PORT || "4005"
export const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

export default defineConfig({
  root: ".",
  build: {
    rollupOptions: {
      external: ["react", "react-dom"],
    },
    lib: {
      entry: "src/client/index.tsx", // or 'src/main.ts' if TypeScript
      name: "aurora-extension-a", // Replace with your library's global name
      formats: ["es"], // Output formats: ESM and CommonJS
      fileName: () => `index.js`, // Output file names
    },
    outDir: "dist/client",
  },
  define: {
    BFF_ENDPOINT: JSON.stringify(BFF_ENDPOINT),
  },
  plugins: [
    react(),
    svgr(),
    tsconfigPaths(),
    dts({
      rollupTypes: true, // Enables type bundling
      insertTypesEntry: true, // Ensures a types entry is added to package.json
      outDir: "dist/client",
      logLevel: "warn",
      tsconfigPath: "./.config/tsconfig.client.json",
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: {
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
