import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// Root-Verzeichnis und andere Konstanten
const ROOT = path.resolve(__dirname, "..")
const manifestPath = path.join(ROOT, "aurora.config.json")
const extensionsDir = path.join(ROOT, "extensions")

// Interface für Extension im Manifest
interface Extension {
  source: string
  name: string
}

interface InstalledExtension extends Extension {
  packageJson: {
    name: string
    exports: {
      [key: string]: string | { import: string; require: string }
    }
  }
}

type Error = {
  message: string
}

interface ExtensionImportEntry {
  name: string
  id: string
  packagePath: string
  clientPath?: string
  serverPath?: string
}

function generateValidPackageName(name: string) {
  // Step 1: Remove leading or trailing spaces and normalize case
  name = name.trim().toLowerCase()

  // Step 2: Replace characters not allowed by npm with valid substitutes
  name = name
    .replace(/@/g, "") // Remove '@' as it is for scopes
    .replace(/\//g, "_") // Replace '/' with '_' to avoid file system issues
    .replace(/[^a-z0-9-_]/g, "") // Remove any character that isn't alphanumeric, hyphen or underscore
    .replace(/^[_\.]/, "") // Remove leading underscore or period
    .replace(/[_\.]$/, "") // Remove trailing underscore or period

  // Step 3: Ensure the name is not empty
  if (name === "") {
    throw new Error("Invalid package name: Name cannot be empty after cleanup.")
  }

  // Step 4: Return the cleaned package name
  return name
}

/*
const client0 = import("./node_modules/@cobaltcore-dev/aurora-extension-a/dist/client/index.js").then((m) =>
  m.registerClient()
)

export const registerClients = () => {
  return [
    {
      extensionName: "@cobaltcore-dev/aurora-extension-a",
      routerScope: "cobaltcore-dev_aurora-extension-a",
      App: client0.then((m) => ({ default: m.App })),
      Logo: client0.then((m) => ({ default: m.Logo })),
    },
  ]
}

*/
const generateExtensionsImportFile = (entries: ExtensionImportEntry[] = []): void => {
  const clientImports = []
  const serverImports = []

  const clientExports = [`export const registerClients = () => ([`]
  const serverExports = [`export const registerServers = () => ({`]

  for (const index in entries) {
    const entry = entries[index]
    console.log("====", entry)
    if (entry.clientPath) {
      clientImports.push(`const client${index} = import("./${entry.clientPath}").then((m) => m.registerClient());`)
      clientExports.push("  {")
      clientExports.push(`    extensionName: "${entry.name}", `)
      clientExports.push(`    routerScope: "${entry.id}",`)
      clientExports.push(`    App: client0.then((m) => ({ default: m.App })),`)
      clientExports.push(`    Logo: client0.then((m) => ({ default: m.Logo })),`)
      clientExports.push("  },")
    }
    if (entry.serverPath) {
      serverImports.push(`import * as server${index} from "./${entry.serverPath}";`)
      serverExports.push(`  "${entry.id}": server${index}.registerRouter().appRouter,`)
    }
  }
  clientExports.push(`])`)
  serverExports.push(`})`)

  const clientFileContent = [...clientImports, "", ...clientExports]
  const serverFileContent = [...serverImports, "", ...serverExports]

  fs.writeFileSync(path.join(extensionsDir, "client.ts"), clientFileContent.join("\n"))
  fs.writeFileSync(path.join(extensionsDir, "server.ts"), serverFileContent.join("\n"))
}

const createExtensionImportEntry = (extension: InstalledExtension): ExtensionImportEntry | null => {
  const packagePath = path.join("node_modules", extension.packageJson.name)
  const pkgExports = extension.packageJson.exports

  const importEntry: ExtensionImportEntry = {
    name: extension.name,
    id: generateValidPackageName(extension.name),
    packagePath,
  }
  const clientExport =
    typeof pkgExports["./client"] === "string"
      ? pkgExports["./client"]
      : pkgExports["./client"]?.import || pkgExports["./client"]?.require
  const serverExport =
    typeof pkgExports["./server"] === "string"
      ? pkgExports["./server"]
      : pkgExports["./server"]?.import || pkgExports["./server"]?.require

  if (clientExport) {
    importEntry.clientPath = path.join(packagePath, "/", clientExport)
  }
  if (serverExport) {
    importEntry.serverPath = path.join(packagePath, "/", serverExport)
  }

  return importEntry
}

const loadManifestExtensions = (): Extension[] => {
  try {
    const { extensions } = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
    return extensions
  } catch (e: Error | any) {
    console.warn("Could not read extensions manifest", e?.message)
    return []
  }
}

const installExtension = (extension: Extension): ExtensionImportEntry | null => {
  try {
    console.info("=== Installing " + extension.source)

    // Install extension to extensions directory using --prefix
    execSync(`npm install ${extension.source} --prefix ${extensionsDir}`, { stdio: "inherit" })

    // get package info
    const packageInfo = JSON.parse(execSync(`npm show ${extension.source} --json`).toString())
    // add packageJson to extension as installedExtension
    const installedExtension: InstalledExtension = {
      ...extension,
      packageJson: packageInfo,
    }

    // create import entry for extension
    return createExtensionImportEntry(installedExtension)
  } catch (e: Error | any) {
    console.error("Could not install " + extension.source, e?.message)
    return null
  }
}

// ############################ MAIN ############################

function main() {
  fs.mkdirSync(extensionsDir, { recursive: true })
  // Load extensions from manifest
  const extensions = loadManifestExtensions()
  // Install extensions
  const extensionImportEntries = extensions
    .map((extension) => installExtension(extension))
    .filter((e) => e !== null) as ExtensionImportEntry[]

  generateExtensionsImportFile(extensionImportEntries)
}

main()
