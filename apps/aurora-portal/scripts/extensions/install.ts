import fs from "fs"
import path from "path"
import { installExtension, Extension } from "./extension"
import { generateAuroraExtensionImports } from "./aurora-extension"
import { generateJunoAppImports } from "./juno-app"
import { ExtensionImports } from "./shared-types"

// Root-Verzeichnis und andere Konstanten
const ROOT = path.resolve(__dirname, "../../")
const manifestPath = path.join(ROOT, "aurora.config.json")
const extensionsTmpDir = path.join(ROOT, "tmp")
const extensionsDir = path.join(ROOT, "node_modules")
const clientImportsFile = path.join(ROOT, "src/client/generated", "extensions.tsx")
const serverImportsFile = path.join(ROOT, "src/server/generated", "extensions.ts")
const npmrcFile = path.join(ROOT, ".npmrc")

type Error = {
  message: string
}

const generateExtensionsImportFiles = (extensionImports: ExtensionImports[] = []): void => {
  const clientImports: string[] = []
  const serverImports: string[] = []
  const clientExports = [`export const clientExtensions = [`]
  const serverExports = [`export const serverExtensions = {`]

  for (const imports of extensionImports) {
    if (imports?.clientImports?.length) {
      clientImports.push(...imports.clientImports)
    }
    if (imports?.clientExports?.length) {
      clientExports.push(...imports.clientExports)
    }
    if (imports?.serverImports?.length) {
      serverImports.push(...imports.serverImports)
    }
    if (imports?.serverExports?.length) {
      serverExports.push(...imports.serverExports)
    }
  }
  clientExports.push(`]`)
  serverExports.push(`}`)

  const clientFileContent = [...clientImports, "", ...clientExports]
  const serverFileContent = [...serverImports, "", ...serverExports]

  fs.mkdirSync(path.dirname(clientImportsFile), { recursive: true })
  fs.writeFileSync(clientImportsFile, clientFileContent.join("\n"))
  fs.mkdirSync(path.dirname(serverImportsFile), { recursive: true })
  fs.writeFileSync(serverImportsFile, serverFileContent.join("\n"))
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

function install() {
  // delete tmp directory if it exists
  if (fs.existsSync(extensionsTmpDir)) fs.rmSync(extensionsTmpDir, { recursive: true, force: true })
  // create tmp directory
  fs.mkdirSync(extensionsTmpDir, { recursive: true })
  // copy .npmrc file to tmp directory if it exists
  if (fs.existsSync(npmrcFile)) fs.cpSync(npmrcFile, path.join(extensionsTmpDir, ".npmrc"), { force: true })

  // Load extensions from manifest
  const extensions = loadManifestExtensions()
  const allImports = []
  // Install all registered extensions
  for (const extension of extensions) {
    // install extension
    const installedExtension = installExtension(extension, { extensionsDir, extensionsTmpDir })
    // skip if extension could not be installed
    if (installedExtension === null) {
      console.warn("Could not install " + extension.source)
      continue
    }

    let extensionImports = null
    switch (installedExtension.type) {
      case "aurora-extension":
        extensionImports = generateAuroraExtensionImports(installedExtension)
        break
      case "juno-app":
        extensionImports = generateJunoAppImports(installedExtension)
        break
    }

    if (extensionImports === null) {
      console.warn("Could not generate imports for " + installedExtension.name)
      continue
    }

    allImports.push(extensionImports)
  }

  generateExtensionsImportFiles(allImports)

  // delete tmp directory
  fs.rmSync(extensionsTmpDir, { recursive: true, force: true })
  return true
}

install()
