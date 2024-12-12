import path from "path"
import { readdirSync } from "fs"
import { type NonEmptyArray } from "type-graphql"

// Get all paths to resolvers
// resolvers are located in the resolvers folder of each component
// and are exported in an index.ts file
const componentsDir = path.resolve(__dirname, ".")
const resolverPaths = readdirSync(componentsDir, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .map((dir) => path.join(componentsDir, dir.name, "resolvers", "index.ts"))

type Resolver = () => void
type Resolvers = NonEmptyArray<Resolver>

// Get all resolvers from all components
export const getResolvers = async (): Promise<Resolvers> => {
  const resolvers = []

  for (const resolverPath of resolverPaths) {
    const resolver = await import(resolverPath)
    const componentResolvers = Object.keys(resolver).map((key) => resolver[key])
    resolvers.push(...componentResolvers)
  }

  return resolvers as Resolvers
}
