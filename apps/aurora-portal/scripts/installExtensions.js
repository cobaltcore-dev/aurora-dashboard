const { execSync } = require("child_process")
const { createHash } = require("crypto")
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
// Path to the manifest
const manifestPath = path.join(ROOT, "manifest.json")
const tmpDir = path.join(ROOT, "tmp/extensions")
const importsFile = path.join(ROOT, "extensions/index.ts") // File to be generated
const extensionsDir = path.join(ROOT, "extensions")
// Read the manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))

// Funktion zum Generieren eines Hashes
function generateHash(input) {
  return createHash("sha256").update(input).digest("hex")
}

// console.log("======================", manifest)
// // Ensure the extensions directory exists
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir)
}

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true })
}

// Install extensions and collect import paths
const imports = []

manifest.extensions.forEach((ext, index) => {
  const extensionHash = generateHash(ext.source)
  const extDir = path.join(tmpDir, extensionHash)

  console.log(`Installiere ${ext.source} in ${extDir}...`)

  // Installiere die Extension mit npm --prefix
  execSync(`npm install --prefix ${extDir} ${ext.source}`, { stdio: "inherit" })

  // Pfad zur package.json der Extension
  const extPackageJsonPath = path.join(extDir, "package.json")

  // package.json einlesen
  const packageJson = JSON.parse(fs.readFileSync(extPackageJsonPath, "utf-8"))

  // Dependency-Namen extrahieren
  const packageName = Object.keys(packageJson.dependencies || {})[0]

  const targetPath = path.join(extensionsDir, packageName)
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true })
  }
  fs.cpSync(path.join(extDir, "node_modules", packageName), path.join(extensionsDir, packageName), {
    recursive: true,
  })
  imports.push("// @ts-ignore")
  imports.push(`import * as extension${index} from './${packageName}/dist/extension.js';`)
})

imports.push("")
imports.push(
  "export const extensions = [" + manifest.extensions.map((_, index) => `extension${index}`).join(", ") + "];"
)

fs.rmSync(tmpDir, { recursive: true })
// // Write the import file
fs.writeFileSync(importsFile, imports.join("\n"))
console.log(`Generated imports file at ${importsFile}`)
