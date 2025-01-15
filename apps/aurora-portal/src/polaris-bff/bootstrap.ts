import path from "node:path"

// const ROOT = path.join(__dirname, "../../")
// import { registerExtensions } from "../extensionsManager"

// export const loadExtensionsRouters = async () => {
//   let extensionRouters = {}

//   const registeredExtensions = await registerExtensions()
//   for (const ext of registeredExtensions) {
//     extensionRouters = { ...extensionRouters, ...ext.router }
//   }
//   return extensionRouters
// }

// @ts-ignore
import { appRouter } from "../../extensions/@cobaltcore-dev/aurora-extension-a/dist/server/routers/index.js"

export const loadExtensionsRouters = async () => ({
  ...appRouter,
})
