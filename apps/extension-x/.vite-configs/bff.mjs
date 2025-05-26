export default {
  build: {
    lib: {
      entry: "src/bff/index.ts",
      formats: ["cjs"],
      fileName: (format) => `index.js`,
    },
    outDir: "dist/bff",
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: [/^\.\.\/client.*/, /^\.\.\/bff.*/, /^@trpc\/.*/],
    },
  },
}
