import { name, version, description } from "../package.json"
import { Extension } from "@cobaltcore-dev/aurora-sdk"
import { Props } from "./client"
import { AppContext } from "./bff"

type AppProps = Omit<Props, "bffPath" | "baseUrl">

const extension: Extension<AppContext, AppProps> = {
  name,
  description,
  version,

  registerServer: async (config?) => {
    const mountPath = config?.mountRoute || ""
    const path = `${mountPath}/_bff`

    const { handleRequest } = await import("./bff")

    return {
      handleRequest,
      path,
    }
  },

  registerClient: async (config?) => {
    const baseUrl = config?.mountRoute ?? ""
    const bffPath = `${baseUrl}/_bff`

    const { mount, unmount } = await import("./client")

    return {
      mount: (container: HTMLElement, props?: AppProps) => mount(container, { ...props, bffPath, baseUrl }),

      unmount,
    }
  },
}

export default extension
