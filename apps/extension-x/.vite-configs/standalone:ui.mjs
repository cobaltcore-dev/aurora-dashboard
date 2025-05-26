export default {
  root: "src/standalone",
  build: {
    outDir: "../../dist/standalone",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^\.\.\/client.*/, /^\.\.\/bff.*/, /^\.\.\/extension.*/],
      output: {
        paths: (id) => {
          if (id.match(/\/extension$/)) {
            return "../extension/index.js/"
          }
          return id
        },
      },
    },
  },
}
