import path from "path"
import { readdirSync } from "fs"

const componentsDir = path.resolve(__dirname, ".")
const apisPaths = readdirSync(componentsDir, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .map((dir) => path.join(componentsDir, dir.name, "apis", "index.ts"))

type Api = () => void
type Apis = {
  [key: string]: Api
}

// Get all apis from all components
export const getApis = async (): Promise<Apis> => {
  const apisMap: Apis = {}

  for (const apiPath of apisPaths) {
    const apis = await import(apiPath)

    for (const key in apis) {
      const apiName: string = key.charAt(0).toLowerCase() + key.slice(1)
      apisMap[apiName] = new apis[key]()
    }
  }

  return apisMap as Apis
}
