import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// Root-Verzeichnis und andere Konstanten
const ROOT = path.resolve(__dirname, "..")
const manifestPath = path.join(ROOT, "extensions.manifest.json")
const extensionsDir = path.join(ROOT, "extensions")

// Interface für Extension im Manifest
interface Extension {
  source: string
  name: string
}

type Error = {
  message: string
}

let extensions: Extension[] | null = null

// Read manifest
try {
  extensions = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
} catch (e: Error | any) {
  console.warn("Could not read extensions manifest", e?.message)
  process.exit(0)
}

// Install extensions
extensions?.forEach((extension) => {
  try {
    console.info("=== Installing " + extension.source)

    // Install extension to extensions directory using --prefix
    execSync(`npm install ${extension.source} --prefix ${extensionsDir}`, { stdio: "inherit" })
  } catch (e: Error | any) {
    console.error("Could not install " + extension.source, e?.message)
  }
})
