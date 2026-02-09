import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  ...viteConfig({ mode: "test" }), // Use the vite config for test environment
  test: {
    globals: true,
    environment: "jsdom",
    watch: true,
    setupFiles: [
      `${__dirname}/vitest.setup.ts`, // Absolute path from project root
    ],
  },
})
