// vite.config.mjs
import { defineConfig } from "file:///workspace/aurora-dashboard/node_modules/.pnpm/vite@5.4.11_@types+node@22.10.5/node_modules/vite/dist/node/index.js";
import react from "file:///workspace/aurora-dashboard/node_modules/.pnpm/@vitejs+plugin-react-swc@3.7.2_vite@5.4.11_@types+node@22.10.5_/node_modules/@vitejs/plugin-react-swc/index.mjs";
import tailwindcss from "file:///workspace/aurora-dashboard/node_modules/.pnpm/tailwindcss@3.4.17/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///workspace/aurora-dashboard/node_modules/.pnpm/autoprefixer@10.4.20_postcss@8.4.49/node_modules/autoprefixer/lib/autoprefixer.js";
import tsconfigPaths from "file:///workspace/aurora-dashboard/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.7.3_vite@5.4.11_@types+node@22.10.5_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import svgr from "file:///workspace/aurora-dashboard/node_modules/.pnpm/vite-plugin-svgr@4.3.0_rollup@4.30.1_typescript@5.7.3_vite@5.4.11_@types+node@22.10.5_/node_modules/vite-plugin-svgr/dist/index.js";
import dts from "file:///workspace/aurora-dashboard/node_modules/.pnpm/vite-plugin-dts@4.5.0_@types+node@22.10.5_rollup@4.30.1_typescript@5.7.3_vite@5.4.11_@types+node@22.10.5_/node_modules/vite-plugin-dts/dist/index.mjs";
import * as dotenv from "file:///workspace/aurora-dashboard/node_modules/.pnpm/dotenv@16.4.7/node_modules/dotenv/lib/main.js";
import process from "process";
dotenv.config();
var PORT = process.env.PORT || "3000";
var BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff";
var vite_config_default = defineConfig({
  root: ".",
  build: {
    rollupOptions: {
      external: ["react", "react-dom"]
    },
    lib: {
      entry: "src/client/index.tsx",
      // or 'src/main.ts' if TypeScript
      name: "aurora-extension-a",
      // Replace with your library's global name
      formats: ["es"],
      // Output formats: ESM and CommonJS
      fileName: () => `index.js`
      // Output file names
    },
    outDir: "dist/client"
  },
  define: {
    BFF_ENDPOINT: JSON.stringify(BFF_ENDPOINT)
  },
  plugins: [
    react(),
    svgr(),
    tsconfigPaths(),
    dts({
      rollupTypes: true,
      // Enables type bundling
      insertTypesEntry: true,
      // Ensures a types entry is added to package.json
      outDir: "dist/client",
      logLevel: "warn",
      tsconfigPath: "./.config/tsconfig.client.json"
    })
  ],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer]
    }
  },
  preview: {
    host: true,
    port: PORT
  }
});
export {
  BFF_ENDPOINT,
  PORT,
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL3dvcmtzcGFjZS9hdXJvcmEtZGFzaGJvYXJkL2FwcHMvYXVyb3JhLWV4dGVuc2lvbi1hXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvd29ya3NwYWNlL2F1cm9yYS1kYXNoYm9hcmQvYXBwcy9hdXJvcmEtZXh0ZW5zaW9uLWEvdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy93b3Jrc3BhY2UvYXVyb3JhLWRhc2hib2FyZC9hcHBzL2F1cm9yYS1leHRlbnNpb24tYS92aXRlLmNvbmZpZy5tanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcInRhaWx3aW5kY3NzXCJcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSBcImF1dG9wcmVmaXhlclwiXG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiXG5pbXBvcnQgc3ZnciBmcm9tIFwidml0ZS1wbHVnaW4tc3ZnclwiXG5pbXBvcnQgZHRzIGZyb20gXCJ2aXRlLXBsdWdpbi1kdHNcIlxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gXCJkb3RlbnZcIlxuaW1wb3J0IHByb2Nlc3MgZnJvbSBcInByb2Nlc3NcIlxuXG5kb3RlbnYuY29uZmlnKClcblxuZXhwb3J0IGNvbnN0IFBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IFwiMzAwMFwiXG5leHBvcnQgY29uc3QgQkZGX0VORFBPSU5UID0gcHJvY2Vzcy5lbnYuQkZGX0VORFBPSU5UIHx8IFwiL3BvbGFyaXMtYmZmXCJcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogXCIuXCIsXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCJdLFxuICAgIH0sXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogXCJzcmMvY2xpZW50L2luZGV4LnRzeFwiLCAvLyBvciAnc3JjL21haW4udHMnIGlmIFR5cGVTY3JpcHRcbiAgICAgIG5hbWU6IFwiYXVyb3JhLWV4dGVuc2lvbi1hXCIsIC8vIFJlcGxhY2Ugd2l0aCB5b3VyIGxpYnJhcnkncyBnbG9iYWwgbmFtZVxuICAgICAgZm9ybWF0czogW1wiZXNcIl0sIC8vIE91dHB1dCBmb3JtYXRzOiBFU00gYW5kIENvbW1vbkpTXG4gICAgICBmaWxlTmFtZTogKCkgPT4gYGluZGV4LmpzYCwgLy8gT3V0cHV0IGZpbGUgbmFtZXNcbiAgICB9LFxuICAgIG91dERpcjogXCJkaXN0L2NsaWVudFwiLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICBCRkZfRU5EUE9JTlQ6IEpTT04uc3RyaW5naWZ5KEJGRl9FTkRQT0lOVCksXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHN2Z3IoKSxcbiAgICB0c2NvbmZpZ1BhdGhzKCksXG4gICAgZHRzKHtcbiAgICAgIHJvbGx1cFR5cGVzOiB0cnVlLCAvLyBFbmFibGVzIHR5cGUgYnVuZGxpbmdcbiAgICAgIGluc2VydFR5cGVzRW50cnk6IHRydWUsIC8vIEVuc3VyZXMgYSB0eXBlcyBlbnRyeSBpcyBhZGRlZCB0byBwYWNrYWdlLmpzb25cbiAgICAgIG91dERpcjogXCJkaXN0L2NsaWVudFwiLFxuICAgICAgbG9nTGV2ZWw6IFwid2FyblwiLFxuICAgICAgdHNjb25maWdQYXRoOiBcIi4vLmNvbmZpZy90c2NvbmZpZy5jbGllbnQuanNvblwiLFxuICAgIH0pLFxuICBdLFxuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbdGFpbHdpbmRjc3MsIGF1dG9wcmVmaXhlcl0sXG4gICAgfSxcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhvc3Q6IHRydWUsXG4gICAgcG9ydDogUE9SVCxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZVLFNBQVMsb0JBQW9CO0FBQzFXLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLGtCQUFrQjtBQUN6QixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLFVBQVU7QUFDakIsT0FBTyxTQUFTO0FBQ2hCLFlBQVksWUFBWTtBQUN4QixPQUFPLGFBQWE7QUFFYixjQUFPO0FBRVAsSUFBTSxPQUFPLFFBQVEsSUFBSSxRQUFRO0FBQ2pDLElBQU0sZUFBZSxRQUFRLElBQUksZ0JBQWdCO0FBRXhELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxTQUFTLFdBQVc7QUFBQSxJQUNqQztBQUFBLElBQ0EsS0FBSztBQUFBLE1BQ0gsT0FBTztBQUFBO0FBQUEsTUFDUCxNQUFNO0FBQUE7QUFBQSxNQUNOLFNBQVMsQ0FBQyxJQUFJO0FBQUE7QUFBQSxNQUNkLFVBQVUsTUFBTTtBQUFBO0FBQUEsSUFDbEI7QUFBQSxJQUNBLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixjQUFjLEtBQUssVUFBVSxZQUFZO0FBQUEsRUFDM0M7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLEtBQUs7QUFBQSxJQUNMLGNBQWM7QUFBQSxJQUNkLElBQUk7QUFBQSxNQUNGLGFBQWE7QUFBQTtBQUFBLE1BQ2Isa0JBQWtCO0FBQUE7QUFBQSxNQUNsQixRQUFRO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixjQUFjO0FBQUEsSUFDaEIsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLFNBQVMsQ0FBQyxhQUFhLFlBQVk7QUFBQSxJQUNyQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
