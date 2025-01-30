import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["react", "react-dom"],
    },
    lib: {
      entry: "src/index.ts", // or 'src/main.ts' if TypeScript
      name: "aurora-sdk", // Replace with your library's global name
      formats: ["es"], // Output formats: ESM and CommonJS
      fileName: () => `index.js`, // Output file names
    },
    outDir: "dist",
  },
  plugins: [
    dts({
      exclude: ["**/*.test.ts", "vitest.setup.ts"], // Exclude test files from type generation
      include: ["src/**/*.ts", "src/**/*.tsx", "types/**/*.ts"], // Include your source and global types
      insertTypesEntry: true, // Ensure types are properly exported
      outDir: "dist/types", // Specify where to output the types
      tsconfigPath: "./tsconfig.json",
      copyDtsFiles: true,
      compilerOptions: {
        // Exclude test files from the type generation
        exclude: ["**/*.test.ts", "vitest.setup.ts"],
      },
    }),
  ],
})
