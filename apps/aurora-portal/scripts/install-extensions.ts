import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { manifestPath, extensionsTmpDir, extensionsDir, clientImportsFile, serverImportsFile } from "./shared/paths"

// Interface für Extension im Manifest
interface Extension {
  source: string
  name?: string
  navigation?: {
    label?: string
  }
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
  label?: string
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

const generateExtensionsImportFile = (entries: ExtensionImportEntry[] = []): void => {
  const clientImports = []
  const serverImports = []

  const clientExports = [`export const registerClients = () => ([`]
  const serverExports = [`export const registerServers = () => ({`]

  for (const index in entries) {
    const entry = entries[index]
    console.log("====", entry)
    if (entry.clientPath) {
      clientImports.push(`const client${index} = import("${entry.clientPath}").then((m) => m.registerClient());`)
      clientExports.push("  {")
      clientExports.push(`    extensionName: "${entry.name}", `)
      clientExports.push(`    routerScope: "${entry.id}",`)
      clientExports.push(`    label: "${entry.label}",`)
      clientExports.push(`    App: client0.then((m) => ({ default: m.App })),`)
      clientExports.push(`    Logo: client0.then((m) => ({ default: m.Logo })),`)
      clientExports.push("  },")
    }
    if (entry.serverPath) {
      serverImports.push(`import * as server${index} from "${entry.serverPath}";`)
      serverExports.push(`  "${entry.id}": server${index}.registerRouter().appRouter,`)
    }
  }
  clientExports.push(`])`)
  serverExports.push(`})`)

  const clientFileContent = [...clientImports, "", ...clientExports]
  const serverFileContent = [...serverImports, "", ...serverExports]

  fs.mkdirSync(path.dirname(clientImportsFile), { recursive: true })
  fs.writeFileSync(clientImportsFile, clientFileContent.join("\n"))
  fs.mkdirSync(path.dirname(serverImportsFile), { recursive: true })
  fs.writeFileSync(serverImportsFile, serverFileContent.join("\n"))
}

const createExtensionImportEntry = (extension: InstalledExtension): ExtensionImportEntry | null => {
  const name = extension.name || extension.packageJson.name
  const packagePath = extension.packageJson.name
  const pkgExports = extension.packageJson.exports

  const importEntry: ExtensionImportEntry = {
    name: extension.name || name,
    id: generateValidPackageName(name),
    label: extension?.navigation?.label || name,
    packagePath,
  }
  if (pkgExports?.["./client"]) importEntry.clientPath = path.join(packagePath, "client")
  if (pkgExports?.["./server"]) importEntry.serverPath = path.join(packagePath, "server")

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
    execSync(`npm install ${extension.source} --prefix ${extensionsTmpDir}`, { stdio: "inherit" })

    // get package info
    const packageInfo = JSON.parse(execSync(`npm show ${extension.source} --json`).toString())

    // ######################### TEST
    fs.rmSync(path.join(extensionsDir, packageInfo.name), { recursive: true, force: true })
    fs.cpSync(
      path.join(extensionsTmpDir, "node_modules", packageInfo.name),
      path.join(extensionsDir, packageInfo.name),
      { recursive: true }
    )
    // ######################### TEST

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
  // Load extensions from manifest
  const extensions = loadManifestExtensions()
  // Install extensions
  const extensionImportEntries = extensions
    .map((extension) => installExtension(extension))
    .filter((e) => e !== null) as ExtensionImportEntry[]

  generateExtensionsImportFile(extensionImportEntries)
  fs.rmSync(extensionsTmpDir, { recursive: true, force: true })
}

main()
