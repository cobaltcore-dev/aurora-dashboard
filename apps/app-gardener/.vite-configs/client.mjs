import { PostcssPlugin } from "./postcssPlugin.mjs"
import { TanStackRouterPlugin } from "./tanstackRouterPlugin.mjs"

export default {
  build: {
    lib: {
      entry: "src/client/index.tsx",
      formats: ["es"],
      fileName: (format) => `index.js`,
    },
    target: "es2015", // Ensure browser compatibility
    outDir: "dist/client",
    sourcemap: true,
    rollupOptions: {},
  },

  define: {
    // Define process.env for browser
    "process.env": {},
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [TanStackRouterPlugin()],
  css: {
    postcss: PostcssPlugin,
  },
}
