import path from "path"
import { readdirSync } from "fs"

const componentsDir = path.resolve(__dirname, ".")
const apiFolders = readdirSync(componentsDir, { withFileTypes: true }).filter((dir) => dir.isDirectory())

type Apis = {
  [key: string]: () => void
}

const getApis = async () => {
  const apis: Apis = {}

  for (const dir of apiFolders) {
    const apiPath: string = path.join(componentsDir, dir.name, "api.ts")

    await import(apiPath)
    const componentApis = await import(apiPath)
    for (const key in componentApis) {
      const apiName: string = key.charAt(0).toLowerCase() + key.slice(1)
      apis[apiName] = new componentApis[key]()
    }
  }

  return apis
}

export { getApis }
