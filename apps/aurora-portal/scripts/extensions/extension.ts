import { execSync } from "child_process"
import fs from "fs"
import path from "path"

export interface Extension {
  source: string
  name?: string
  type: "aurora-extension" | "juno-app"
  navigation?: {
    label?: string
    scope: string[]
  }
}

export interface InstalledExtension extends Extension {
  id: string
  name: string
  navigation: Extension["navigation"] & {
    label: string
    scope: string[]
  }
  packageJson: {
    name: string
    main?: string
    module?: string
    exports?: {
      [key: string]: string | { import: string; require: string }
    }
  }
}

interface InstallExtensionOptions {
  extensionsDir: string
  extensionsTmpDir: string
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
    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()) // Convert kebab-case to camelCase

  // Step 3: Ensure the name is not empty
  if (name === "") {
    throw new Error("Invalid package name: Name cannot be empty after cleanup.")
  }

  // Step 4: Return the cleaned package name
  return name
}

export const installExtension = (extension: Extension, options: InstallExtensionOptions): InstalledExtension | null => {
  try {
    const { extensionsDir, extensionsTmpDir } = options

    console.info("=== Installing " + extension.source)

    // Install extension to extensions directory using --prefix
    execSync(`npm install ${extension.source} --prefix ${extensionsTmpDir}`, { stdio: "inherit" })

    // get package info
    const packageInfo = JSON.parse(execSync(`npm show ${extension.source} --json`).toString())

    // copy extension to node_modules to support node resolution
    // TODO: use mv instead of cp

    fs.rmSync(path.join(extensionsDir, packageInfo.name), { recursive: true, force: true })
    // this is much faster than fs.copyFileSync but it doesn't follow symlinks
    // fs.renameSync(
    //   path.join(extensionsTmpDir, "node_modules", packageInfo.name), // source: TMP/node_modules/PACKAGE
    //   path.join(extensionsDir, packageInfo.name) // destination: ROOT/node_modules/PACKAGE
    // )
    fs.cpSync(
      path.join(extensionsTmpDir, "node_modules", packageInfo.name),
      path.join(extensionsDir, packageInfo.name),
      { recursive: true }
    )

    // add packageJson to extension as installedExtension
    const installedExtension: InstalledExtension = {
      ...extension,
      name: extension.name || packageInfo.name,
      id: generateValidPackageName(packageInfo.name),

      navigation: {
        ...extension.navigation,
        label: extension?.navigation?.label || extension.name || packageInfo.name,
        scope: extension?.navigation?.scope || ["domain", "project"],
      },
      packageJson: packageInfo,
    }

    return installedExtension
  } catch (e: Error | any) {
    console.error("Could not install " + extension.source, e?.message)
    console.error("If the source differs from the npm registry, make sure to add the correct .npmrc file.")
    return null
  }
}
