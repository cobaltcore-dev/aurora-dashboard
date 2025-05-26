import react from "@vitejs/plugin-react"

export default {
  root: "src/standalone",

  build: {
    outDir: "../../dist/dev",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
  plugins: [react()],
}
