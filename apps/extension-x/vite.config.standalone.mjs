// export default {
//   // plugins: [react()],

import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const common = {
    root: "./src",
    build: {
      outDir: "../dist/",
      rollupOptions: {
        external: [/^\.\/client.*/, /^\.\/bff.*/, /^\.\/extension.*/],
      },
    },
  }

  if (mode === "ui") {
    return {
      ...common,
      build: {
        ...common.build,
        emptyOutDir: false,
        sourcemap: true,
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
      },
    }
  }
})
