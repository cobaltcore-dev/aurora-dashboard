import fs from "fs"
import path from "path"
import { installExtension, Extension, InstalledExtension } from "./extension"

// Root-Verzeichnis und andere Konstanten
const ROOT = path.resolve(__dirname, "../../")
const manifestPath = path.join(ROOT, "aurora.config.json")
const extensionsTmpDir = path.join(ROOT, "tmp")
const extensionsDir = path.join(ROOT, "node_modules")
const extensionsFile = path.join(ROOT, "src/extensions.json")
const npmrcFile = path.join(ROOT, ".npmrc")

type Error = {
  message: string
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

  const installedExtensions: InstalledExtension[] = []

  // Install all registered extensions
  for (const extension of extensions) {
    // install extension
    const installedExtension = installExtension(extension, { extensionsDir, extensionsTmpDir })
    // skip if extension could not be installed
    if (installedExtension === null) {
      console.warn("Could not install " + extension.source)
      continue
    }

    installedExtensions.push(installedExtension)
  }

  fs.writeFileSync(extensionsFile, JSON.stringify(installedExtensions, null, 2))
  // delete tmp directory
  fs.rmSync(extensionsTmpDir, { recursive: true, force: true })
  return true
}

install()
