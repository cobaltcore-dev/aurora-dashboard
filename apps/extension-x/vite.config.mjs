// export default {
//   root: "./src/standalone",
//   build: {
//     emptyOutDir: true, // Clear the output directory before building
//     outDir: "../../dist/standalone", // Output directory for the client
//     sourcemap: true, // Optional: Generate sourcemaps
//   },
// }

// vite.config.ts
import { defineConfig } from "vite"
// import react from "@vitejs/plugin-react"

export default defineConfig({
  // plugins: [react()],

  root: "./src/standalone",

  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    sourcemap: true,
    formats: ["es", "cjs"],

    rollupOptions: {
      // Tell Rollup which modules to treat as external
      external: [
        "node:http",
        "node:fs",
        "node:path",
        "fastify",
        "@trpc/server",
        /^\.\.\/server/,
        /^\.\/server/,
        /^src\/server/,
        // Other Node.js specific dependencies
      ],
    },
  },

  // Define Node.js conditions for better tree-shaking
  resolve: {
    conditions: ["browser", "module", "import", "default"],
    mainFields: ["browser", "module", "main"],
  },
})

// export default {
//   build: {
//     lib: {
//       entry: {
//         client: "src/client/App.tsx",
//         interface: "src/interface/index.ts",
//       },
//       formats: ["es", "cjs"],
//       fileName: (format, entryName) => `${entryName}/index.${format === "es" ? "js" : "cjs"}`,
//     },

//     // Generate source maps
//     sourcemap: true,
//     // Don't clear the output directory, so we can build multiple entry points
//     emptyOutDir: false,
//     // Output directory
//     outDir: "./dist",
//   },
// }

// build: {
//   rollupOptions: {
//     external: ["react", "react-dom"],
//   },
//   lib: {
//     entry: "src/client/index.tsx", // or 'src/main.ts' if TypeScript
//     name: "aurora-extension-a", // Replace with your library's global name
//     formats: ["es"], // Output formats: ESM and CommonJS
//     fileName: () => `index.js`, // Output file names
//   },
//   outDir: "dist/client",
// },
