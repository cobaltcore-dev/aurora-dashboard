import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// export default defineConfig({
//   root: "./src/client",
//   build: {
//     // lib: {
//     //   entry: "src/client/index.tsx",
//     //   formats: ["es"],
//     //   fileName: (format) => `index.js`,
//     // },
//     // outDir: "dist/client",
//     // sourcemap: true,
//     // emptyOutDir: true,

//     outDir: "../../dist/client",
//     sourcemap: true,
//     emptyOutDir: true,
//     rollupOptions: {
//       input: {
//         // Multiple entry points with predictable names
//         index: "src/client/index.tsx",
//         // "standalone-app": resolve(__dirname, "src/main.tsx"),
//         // Add more as needed
//       },
//       output: {
//         entryFileNames: "[name].js", // Creates extension-client.js, standalone-app.js
//         // chunkFileNames: "chunks/[name]-[hash].js",
//         // assetFileNames: "assets/[name]-[hash].[ext]",
//       },
//     },
//   },
//   plugins: [react()],
// })

export default defineConfig({
  build: {
    lib: {
      entry: "src/client/index.tsx",
      formats: ["es"],
      fileName: (format) => `index.js`,
    },
    target: "es2015", // Ensure browser compatibility
    outDir: "dist/client",
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      // external: [
      //   // Externalize React dependencies
      //   'react',
      //   'react-dom',
      //   'react-dom/client'
      // ],
      // output: {
      //   // Provide global variables for externalized deps
      //   globals: {
      //     'react': 'React',
      //     'react-dom': 'ReactDOM',
      //     'react-dom/client': 'ReactDOM'
      //   }
      // }
    },
  },
  plugins: [react()],
  define: {
    // Define process.env for browser
    "process.env": {},
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
})
