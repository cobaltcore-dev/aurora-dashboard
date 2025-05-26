import { name, version, description } from "../../package.json"
import { Extension } from "@cobaltcore-dev/extension-sdk"
import { Props } from "../client/index.js"
import { AppContext } from "../bff/index.js"

const extension: Extension<AppContext, Props> = {
  name,
  description,
  version,

  registerServer: async (config?) => {
    const { registerServer } = await import("../bff/index.js")
    return registerServer(config)
  },

  registerClient: async (config?) => {
    const { registerClient } = await import("../client/index.js")
    return registerClient(config)
  },
}

export default extension
