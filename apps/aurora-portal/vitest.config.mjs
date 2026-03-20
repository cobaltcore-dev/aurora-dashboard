import { defineConfig } from "vitest/config"
import viteConfig from "./vite.config.mjs"

const config = viteConfig({ mode: "test" }) // Use the vite config for test environment

export default defineConfig({
  ...config,
  test: {
    globals: true,
    environment: "jsdom",
    watch: true,
    setupFiles: "./vitest.setup.ts",
    pool: "forks", // Use forks instead of threads for better memory isolation
    poolOptions: {
      forks: {
        singleFork: false, // Use multiple forks
        execArgv: ["--max-old-space-size=4096"], // Increase Node.js memory limit to 4GB
      },
    },
    maxConcurrency: 5, // Limit concurrent tests to reduce memory pressure
  },
})
