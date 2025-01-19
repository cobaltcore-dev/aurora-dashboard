import * as server0 from "./node_modules/@cobaltcore-dev/aurora-extension-a/dist/server/routers/index.js"

export const registerServers = () => ({
  "cobaltcore-dev_aurora-extension-a": server0.registerRouter().appRouter,
})
