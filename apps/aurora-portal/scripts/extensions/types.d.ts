import { Extension as ExtensionInterface } from "@cobaltcore-dev/aurora-sdk"

export interface Extension {
  source: string // Can be a file path or package name
  type: "aurora-extension" | "juno-app" // Allowed types
  entrypoint: string
  id?: string
  navigation: {
    label: string // Display label
    scope: ("project" | "domain")[] // Allowed scopes
  }
}

export interface InstalledExtension extends Extension {
  id: string
  name: string
  version: string
  uiLoader?: Promise<ExtensionInterface<{}, {}>> // UI loader, a promise that is needed to allow bundler to resolve the extension
}
