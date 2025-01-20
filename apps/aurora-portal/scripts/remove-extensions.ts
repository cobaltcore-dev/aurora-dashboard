import { execSync } from "child_process"
import fs from "fs"
import path from "path"

import { manifestPath, extensionsDir } from "./paths"

interface Extension {
  source: string
  name: string
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

const removeExtensions = (extensions: Extension[]): void => {
  for (const extension of extensions) {
    const packageInfo = JSON.parse(execSync(`npm show ${extension.source} --json`).toString())
    console.info("=== Remove " + packageInfo.name)
    try {
      fs.rmSync(path.join(extensionsDir, packageInfo.name), { recursive: true, force: true })
    } catch (e: Error | any) {
      console.error("Could not remove " + extension.source, e?.message)
      continue
    }
  }
}

loadManifestExtensions().forEach((extension) => {
  removeExtensions([extension])
})
