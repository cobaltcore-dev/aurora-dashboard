import { defineConfig } from "tsup"
import pkg from "./package.json"

// All declared dependencies stay external except the two workspace packages we bundle in.
// devDependencies are also external — they are build tools, not runtime deps.
const external = [
  ...Object.keys(pkg.dependencies).filter(
    (dep) => dep !== "@cobaltcore-dev/policy-engine" && dep !== "@cobaltcore-dev/signal-openstack"
  ),
  ...Object.keys(pkg.devDependencies),
]

export default defineConfig({
  entry: {
    index: "src/server/index.ts",
  },
  outDir: "dist/server",
  format: ["cjs"],
  target: "node18",
  platform: "node",
  tsconfig: "tsconfig.server.json",
  dts: true,
  sourcemap: false,
  clean: true,
  external,
  // Bundle these internal workspace packages so consumers don't need to install them
  noExternal: ["@cobaltcore-dev/policy-engine", "@cobaltcore-dev/signal-openstack"],
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
    }
  },
})
