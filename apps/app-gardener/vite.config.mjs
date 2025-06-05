import { defineConfig } from "vite"

import dev from "./.vite-configs/dev.mjs"
import standaloneServer from "./.vite-configs/standalone:server.mjs"
import standaloneUI from "./.vite-configs/standalone:ui.mjs"
import client from "./.vite-configs/client.mjs"
import bff from "./.vite-configs/bff.mjs"
import extension from "./.vite-configs/extension.mjs"

export default defineConfig(({ mode }) => {
  switch (mode) {
    case "dev":
      return dev
    case "standalone:server":
      return standaloneServer
    case "standalone:ui":
      return standaloneUI
    case "client":
      return client
    case "bff":
      return bff
    case "extension":
      return extension
    default:
      return dev
  }
})
