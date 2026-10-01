import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: { index: "src/server/index.ts" },
    outDir: "dist/server",
    format: ["cjs"],
    target: "node18",
    platform: "node",
    tsconfig: "tsconfig.server.json",
    dts: true,
    sourcemap: false,
    clean: false,
    external: ["@cobaltcore-dev/aurora", "@trpc/server", "zod"],
  },
  {
    entry: { index: "src/client/index.tsx" },
    outDir: "dist/client",
    format: ["esm"],
    target: "esnext",
    platform: "browser",
    tsconfig: "tsconfig.client.json",
    dts: true,
    sourcemap: false,
    clean: false,
    jsx: "react-jsx",
    outExtension: () => ({ js: ".js" }),
    external: ["react", "react/jsx-runtime", "@cobaltcore-dev/aurora", "@cloudoperators/juno-ui-components", "zod"],
  },
])
