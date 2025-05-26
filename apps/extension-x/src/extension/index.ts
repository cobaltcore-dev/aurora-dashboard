import { name, version, description } from "../../package.json"
import { Extension } from "@cobaltcore-dev/extension-sdk"
import { Props } from "../client"
import { AppContext } from "../bff"

const extension: Extension<AppContext, Props> = {
  name,
  description,
  version,

  registerServer: async (config?) => {
    const { registerServer } = await import("../bff")
    return registerServer(config)
  },

  registerClient: async (config?) => {
    const { registerClient } = await import("../client")
    return registerClient(config)
  },
}

export default extension
