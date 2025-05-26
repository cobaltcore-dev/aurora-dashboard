export default {
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/extension.ts",
      formats: ["es"], // Build both formats
      fileName: (format) => `extension.js`,
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: [/^\.\/client.*/, /^\.\/bff.*/],
      output: {
        paths: (id) => {
          // Adjust paths for client and bff modules
          // This is necessary to ensure that the paths are correct in the output
          // when the extension is used in a standalone mode
          if (id.match(/\/client$/)) {
            return "./client/index.js/"
          } else if (id.match(/\/bff$/)) {
            return "./bff/index.js/"
          }
          return id
        },
      },
    },
  },
}
