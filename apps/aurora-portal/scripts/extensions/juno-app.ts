import { ExtensionImports } from "./shared-types"
import { InstalledExtension } from "./extension"
import path from "path"
import fs from "fs"

export const generateJunoAppImports = (extension: InstalledExtension): ExtensionImports => {
  const name = extension.name || extension.packageJson.name
  const packagePath = extension.packageJson.name
  const pkgExports = extension.packageJson.exports
  const clientImports: string[] = []
  const clientExports: string[] = []
  const serverImports: string[] = []
  const serverExports: string[] = []

  // look for main or module entry point
  let entryPoint = extension.packageJson.main || extension.packageJson.module

  // if no main or module, look for exports
  if (!entryPoint && pkgExports) {
    // look for default export
    const mainExport = pkgExports?.["."] || pkgExports?.["./index"]
    // look for import or require
    if (typeof mainExport === "object") {
      if (mainExport["import"]) {
        entryPoint = mainExport["import"]
      } else if (mainExport["require"]) {
        entryPoint = mainExport["require"]
      }
    }
  }

  const entryPath = path.join(packagePath, entryPoint || "")

  clientImports.push(`// @ts-expect-error - no types`)
  clientImports.push(`const ${extension.id} = import("${entryPath}");`)
  clientExports.push("  {")
  clientExports.push(`    name: "${name}", `)
  clientExports.push(`    id: "${extension.id}",`)
  clientExports.push(`    navigation: {`)
  clientExports.push(`      label: "${extension.navigation.label}",`)
  clientExports.push(`      scope: ${JSON.stringify(extension.navigation.scope)}`)
  clientExports.push(`    },`)
  clientExports.push(
    `    App: ${extension.id}.then((m) => ({ default: (props:object) => <div ref={(el) => m.mount(el, { props })} /> }))`
  )
  clientExports.push("  },")

  return {
    clientImports,
    serverImports,
    clientExports,
    serverExports,
  }
}
