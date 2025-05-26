export default {
  root: "src/standalone",
  build: {
    outDir: "../../dist/standalone",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      external: [/^\.\.\/client.*/, /^\.\.\/bff.*/, /^\.\.\/extension.*/],
      output: {
        // Fix: Handle ESM imports in CJS output
        interop: "auto",
        exports: "auto",
      },
    },
    ssr: true,
    target: "node22",
    lib: {
      entry: "server.ts",
      formats: ["cjs"],
      fileName: (format) => `index.js`,
    },
  },
}
