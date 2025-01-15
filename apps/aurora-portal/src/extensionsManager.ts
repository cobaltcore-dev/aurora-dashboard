import { M } from "vite/dist/node/types.d-aGj9QkWt"
import { ExtensionProps, Extension } from "./shared/types/extension"

const registeredExtensions: ExtensionProps[] = []

export async function registerExtensions(): Promise<ExtensionProps[]> {
  if (registeredExtensions.length > 0) {
    return registeredExtensions
  }
  // @ts-ignore
  const extensions: Extension[] = await import("../extensions/index.ts")
    .then((m) => m.extensions)
    .catch((e) => {
      console.warn("No extensions found", e.message)
    })
  for (let ext of extensions) {
    registeredExtensions.push(ext.register())
  }

  return registeredExtensions
}
