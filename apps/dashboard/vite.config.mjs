import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import viteFastify from "@fastify/vite/plugin"

export default defineConfig(({ mode }) => ({
  root: "./src/client",
  build: {
    outDir: "../../dist/client",
    sourcemap: true,
    emptyOutDir: true,
    cssMinify: "esbuild",
  },
  plugins: [
    tailwindcss(),
    mode !== "production" && mode !== "test" && viteFastify(),
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    svgr(),
    tsconfigPaths(),
  ],
}))
