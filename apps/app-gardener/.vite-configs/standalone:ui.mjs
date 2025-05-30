export default {
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^\.\/client.*/, /^\.\/bff.*/, /^\.\/extension.*/],
      output: {
        paths: (id) => {
          if (id.match(/\/extension$/)) {
            return "./extension.js"
          }
          return id
        },
      },
    },
  },
}
