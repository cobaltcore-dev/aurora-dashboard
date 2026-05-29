import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  build: {
    lib: {
      entry: "./src/client/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist/client",
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
  plugins: [react(), tsconfigPaths()],
})
