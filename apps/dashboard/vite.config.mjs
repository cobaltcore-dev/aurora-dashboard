import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import svgr from "vite-plugin-svgr"
import viteFastify from "@fastify/vite/plugin"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dev-only alias: points @cobaltcore-dev/aurora/client at aurora's source so
// edits to the package are reflected instantly without rebuilding.
// In production the published dist is used — no alias needed.
const auroraRoot = path.resolve(__dirname, "../../packages/aurora")
const monorepoAlias = {
  "@cobaltcore-dev/aurora/client": path.resolve(auroraRoot, "src/client/index.ts"),
  "@": path.resolve(auroraRoot, "src"),
}

export default defineConfig(({ mode }) => ({
  root: "./src/client",
  resolve: {
    alias: mode !== "production" ? monorepoAlias : {},
  },
  build: {
    outDir: "../../dist/client",
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    mode !== "production" && mode !== "test" && viteFastify(),
    // In dev the monorepo alias serves aurora's raw source, so the dashboard
    // must compile Tailwind, SVGR, and Lingui macros itself.
    // In production aurora's pre-built dist already has these baked in.
    mode !== "production" && tailwindcss(),
    mode !== "production" && svgr(),
    react({
      plugins: mode !== "production" ? [["@lingui/swc-plugin", {}]] : [],
    }),
  ],
}))

