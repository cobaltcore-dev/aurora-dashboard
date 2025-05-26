// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const common = {
    root: "./src/standalone",
    build: {
      outDir: "../../dist/standalone",
      rollupOptions: {
        external: [/^\.\.\/client.*/, /^\.\.\/bff.*/, /^\.\.\/extension.*/],
      },
    },
  }

  if (mode === "ui") {
    return {
      ...common,
      build: {
        ...common.build,
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          ...common.build.rollupOptions,

          output: {
            paths: (id) => {
              if (id.match(/\/extension$/)) {
                return "../extension/index.js/"
              }
            },
          },
        },
      },
    }
  } else {
    return {
      ...common,
      build: {
        ...common.build,
        ssr: true,
        target: "node22",
        lib: {
          entry: "server.ts",
          formats: ["cjs"],
          fileName: (format) => `server.js`,
        },
        rollupOptions: {
          ...common.build.rollupOptions,
          output: {
            format: "cjs",
            // Fix: Handle ESM imports in CJS output
            interop: "auto",
            exports: "auto",
          },
        },
      },
    }
  }
})
