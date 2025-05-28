import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { Extension, InstalledExtension } from "./types"

function generateId(name: string) {
  // Step 1: Remove leading or trailing spaces and normalize case
  name = name.trim().toLowerCase()

  // Step 2: Replace characters not allowed by npm with valid substitutes
  name = name
    .replace(/@/g, "") // Remove '@' as it is for scopes
    .replace(/\//g, "_") // Replace '/' with '_' to avoid file system issues
    .replace(/[^a-z0-9-_]/g, "") // Remove any character that isn't alphanumeric, hyphen or underscore
    .replace(/^[_\.]/, "") // Remove leading underscore or period
    .replace(/[_\.]$/, "") // Remove trailing underscore or period
    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()) // Convert kebab-case to camelCase

  // Step 3: Ensure the name is not empty
  if (name === "") {
    throw new Error("Invalid package name: Name cannot be empty after cleanup.")
  }

  // Step 4: Return the cleaned package name
  return name
}

interface InstallExtensionOptions {
  extensionsDir: string
  extensionsTmpDir: string
}

export const installExtension = (extension: Extension, options: InstallExtensionOptions): InstalledExtension | null => {
  try {
    const { extensionsDir, extensionsTmpDir } = options

    console.info("=== Installing " + extension.source)

    // Install extension to extensions directory using --prefix
    execSync(`npm install ${extension.source} --prefix ${extensionsTmpDir}`, { stdio: "inherit" })

    // get package info
    const packageInfo = JSON.parse(execSync(`npm show ${extension.source} --json`).toString())

    fs.rmSync(path.join(extensionsDir, packageInfo.name), { recursive: true, force: true })
    fs.cpSync(
      path.join(extensionsTmpDir, "node_modules", packageInfo.name),
      path.join(extensionsDir, packageInfo.name),
      { recursive: true }
    )

    // add packageJson to extension as installedExtension
    const installedExtension: InstalledExtension = {
      ...extension,
      name: packageInfo.name,
      id: generateId(packageInfo.name),
      version: packageInfo.version,

      navigation: {
        ...extension.navigation,
        label: extension?.navigation?.label || packageInfo.name,
        scope: extension?.navigation?.scope || ["account", "project"],
      },
    }

    return installedExtension
  } catch (e: Error | any) {
    console.error("Could not install " + extension.source, e?.message)
    console.error("If the source differs from the npm registry, make sure to add the correct .npmrc file.")
    return null
  }
}
