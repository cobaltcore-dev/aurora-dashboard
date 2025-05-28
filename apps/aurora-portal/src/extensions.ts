
  export interface Extension {
  source: string // Can be a file path or package name
  type: "aurora-extension" | "juno-app" // Allowed types
  entrypoint: string
  navigation: {
    label: string // Display label
    scope: ("project" | "domain")[] // Allowed scopes
  }
}

export interface InstalledExtension extends Extension {
  id: string
  name: string
  version: string
}


  const extensions: InstalledExtension[] = []

  export default extensions

  