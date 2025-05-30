import react from "@vitejs/plugin-react"
import viteFastify from "@fastify/vite/plugin"
import { TanStackRouterPlugin } from "./tanstackRouterPlugin.mjs"
import { PostcssPlugin } from "./postcssPlugin.mjs"

export default {
  root: "src",

  build: {
    outDir: "../dist/dev",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
  plugins: [TanStackRouterPlugin(), react(), viteFastify()],
  css: {
    postcss: PostcssPlugin,
  },
}
