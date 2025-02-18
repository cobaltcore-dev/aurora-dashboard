import path from "path"
import { ExtensionImports } from "./shared-types"
import { InstalledExtension } from "./extension"

export const generateAuroraExtensionImports = (extension: InstalledExtension): ExtensionImports => {
  const name = extension.name || extension.packageJson.name
  const packagePath = extension.packageJson.name
  const pkgExports = extension.packageJson.exports

  const clientPath = pkgExports?.["./client"] ? path.join(packagePath, "client") : undefined
  const serverPath = pkgExports?.["./server"] ? path.join(packagePath, "server") : undefined

  const clientImports = []
  const clientExports = []
  const serverImports = []
  const serverExports = []

  // console.log("====", entry)
  if (clientPath) {
    clientImports.push(`const ${extension.id} = import("${clientPath}").then((m) => m.registerClient());`)
    clientExports.push("  {")
    clientExports.push(`    name: "${name}", `)
    clientExports.push(`    id: "${extension.id}",`)
    clientExports.push(`    navigation: {`)
    clientExports.push(`      label: "${extension.navigation.label}",`)
    clientExports.push(`      scope: ${JSON.stringify(extension.navigation.scope)}`)
    clientExports.push(`    },`)
    clientExports.push(`    App: ${extension.id}.then((m) => ({ default: m.App })),`)
    clientExports.push(`    Logo: ${extension.id}.then((m) => ({ default: m.Logo })),`)
    clientExports.push("  },")
  }
  if (serverPath) {
    serverImports.push(`import * as ${extension.id} from "${serverPath}";`)
    serverExports.push(`  "${extension.id}": ${extension.id}.registerRouter().appRouter,`)
  }

  return {
    clientImports,
    serverImports,
    clientExports,
    serverExports,
  }
}
