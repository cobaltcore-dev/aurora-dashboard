import react from "@vitejs/plugin-react"

export default {
  root: "src",

  build: {
    outDir: "../dist/dev",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es"],
  },
  plugins: [react()],
}
