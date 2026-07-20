import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"
import svgr from "vite-plugin-svgr"
import viteFastify from "@fastify/vite/plugin"
import { lingui } from "@lingui/vite-plugin"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import dts from "vite-plugin-dts"
import pkg from "./package.json"
// Externalize all declared dependencies for the library build so consumers
// install them once and the bundle has no CJS require() stubs.
const externalDeps = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies), "react/jsx-runtime"]
export default defineConfig(({ mode }) => {
  const isLib = mode === "production"
  const root = mode !== "test" ? "./src/client" : "./"
  return {
    root,
    // React Query — pulled in transitively by trpcClient — reads
    // process.env.NODE_ENV. A library build deliberately leaves that reference in
    // place so the consuming app can substitute it, but that doesn't work for the
    // object-download worker: it's bundled into a string literal (?worker&inline),
    // which no downstream bundler rewrites, and a worker has no `process` — the
    // worker would throw "process is not defined" on start. Vite applies `define`
    // to worker sub-builds too, so this covers it.
    //
    // The lib build only ever runs in production mode, so "production" is what a
    // consumer's own production build would have substituted anyway. Dev is
    // unaffected: apps/dashboard aliases this package to source in dev, so this
    // config isn't used there.
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
    },
    build: isLib
      ? {
          lib: {
            entry: "./index.ts",
            formats: ["es"],
            fileName: () => "index.js",
          },
          outDir: "../../dist/client",
          sourcemap: true,
          emptyOutDir: true,
          cssCodeSplit: false,
          rollupOptions: {
            external: externalDeps,
          },
        }
      : {
          outDir: "../../dist/client",
          sourcemap: true,
          emptyOutDir: true,
          cssMinify: "esbuild",
        },
    plugins: [
      tailwindcss(),
      mode !== "test" &&
        tanstackRouter({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./routes",
          generatedRouteTree: "./routeTree.gen.ts",
          quoteStyle: "double",
          routeFileIgnorePrefix: "-",
          routeFileIgnorePattern: "test",
        }),
      mode !== "production" && mode !== "test" && viteFastify(),
      react({
        plugins: [["@lingui/swc-plugin", {}]],
      }),
      lingui(),
      svgr(),
      tsconfigPaths(),
      isLib &&
        dts({
          include: ["**/*.ts", "**/*.tsx"],
          exclude: ["routes/**", "**/*.test.*", "routeTree.gen.ts"],
          outDir: "../../dist/client",
          tsconfigPath: "../../tsconfig.json",
          entryRoot: ".",
          insertTypesEntry: false,
          rollupTypes: true,
        }),
    ],
  }
})
