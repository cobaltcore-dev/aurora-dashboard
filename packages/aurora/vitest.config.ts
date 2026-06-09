import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react-swc"
import tsconfigPaths from "vite-tsconfig-paths"
import { lingui } from "@lingui/vite-plugin"

export default defineConfig({
  define: {
    BFF_ENDPOINT: JSON.stringify(process.env.BFF_ENDPOINT || "/polaris-bff"),
  },
  plugins: [
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    lingui(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
})
