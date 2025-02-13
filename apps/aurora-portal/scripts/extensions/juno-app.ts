import path from "path"
import { ExtensionImports } from "./shared-types"
import { InstalledExtension } from "./extension"

export const generateJunoAppImports = (extension: InstalledExtension): ExtensionImports => {
  const name = extension.name || extension.packageJson.name
  const packagePath = extension.packageJson.name
  const pkgExports = extension.packageJson.exports
  const entryPath =
    extension.packageJson.main || extension.packageJson.module || pkgExports?.["."] || pkgExports?.["./index"]

  const clientImports: string[] = []
  const clientExports: string[] = []
  const serverImports: string[] = []
  const serverExports: string[] = []

  // // // console.log("====", entry)
  // if (clientPath) {
  //   clientImports.push(`const ${extension.id} = import("${clientPath}").then((m) => m.registerClient());`)
  //   clientExports.push("  {")
  //   clientExports.push(`    extensionName: "${extension.name}", `)
  //   clientExports.push(`    routerScope: "${extension.id}",`)
  //   clientExports.push(`    label: "${extension.navigation.label}",`)
  //   clientExports.push(`    scope: ${JSON.stringify(extension.navigation.scope)},`)
  //   clientExports.push(`    App: client0.then((m) => ({ default: m.App })),`)
  //   clientExports.push(`    Logo: client0.then((m) => ({ default: m.Logo })),`)
  //   clientExports.push("  },")
  // }
  // if (serverPath) {
  //   serverImports.push(`import * as ${extension.id} from "${serverPath}";`)
  //   serverExports.push(`  "${extension.id}": ${extension.id}.registerRouter().appRouter,`)
  // }

  return {
    clientImports,
    serverImports,
    clientExports,
    serverExports,
  }
}
