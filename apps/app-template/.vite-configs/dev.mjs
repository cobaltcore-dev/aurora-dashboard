import react from "@vitejs/plugin-react"
import viteFastify from "@fastify/vite/plugin"

export default {
  root: "src",

  build: {
    outDir: "../dist/dev",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
  plugins: [react(), viteFastify()],
}
