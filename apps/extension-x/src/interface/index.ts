import { name, version, description } from "../../package.json"
import { Extension } from "@cobaltcore-dev/extension-sdk"
import { AppProps } from "./client"
import { AppContext } from "./bff"

type Props = Omit<AppProps, "bffPath" | "baseUrl">

const extension: Extension<Props, AppContext> = {
  name,
  description,
  version,

  registerServer: async (config?) => {
    // Check if we're in a Node.js environment
    if (typeof window !== "undefined") {
      throw new Error("Server module cannot be loaded in browser environment")
    }
    const mountPath = config?.mountRoute || ""

    const { handleRequest } = await import("./bff")
    return {
      handleRequest,
      path: `${mountPath}/_bff`,
    }
  },

  registerClient: async (config?) => {
    const baseUrl = config?.mountRoute || ""
    const bffPath = `${baseUrl}/_bff`

    const { mount, unmount } = await import("./client")
    return {
      mount: (container: HTMLElement, props?: Props) => {
        if (!props) {
          throw new Error("Props are required for mounting the client")
        }
        mount(container, { ...props, bffPath, baseUrl })
      },
      unmount,
    }
  },
}

export default extension
