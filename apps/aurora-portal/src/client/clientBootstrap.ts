import { registerExtensions } from "../extensionsManager"

export const initializeClient = async () => {
  const extensions = await registerExtensions()
  extensions.forEach((extension) => {
    if (extension.ui) {
      console.log(`Loaded UI for ${extension.name} ${extension.ui}`)
    }
  })
}
