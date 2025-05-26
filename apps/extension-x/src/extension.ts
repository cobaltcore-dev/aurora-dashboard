import { name, version, description } from "../package.json"
import { Extension } from "@cobaltcore-dev/extension-sdk"
import { Props } from "./client"
import { AppContext } from "./bff"

const extension: Extension<AppContext, Props> = {
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

    type MountFunction = typeof mount
    type MountProps = Parameters<MountFunction>[1]

    return {
      mount: (container: HTMLElement, props: MountProps) => mount(container, { ...props, bffPath, baseUrl }),
      unmount,
    }
  },
}

export default extension
