import { CodegenConfig } from "@graphql-codegen/cli"
import * as dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()
const schemaUrl = process.env.VITE_GRAPHQL_API_URL || "http://localhost:4000/graphql"

const config: CodegenConfig = {
  schema: schemaUrl,
  documents: "src/**/*.graphql",

  generates: {
    "src/generated/graphql.tsx": {
      plugins: ["typescript", "typescript-operations", "typescript-react-apollo"],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
  },
}

// const config: CodegenConfig = {
//   schema: schemaUrl,
//   documents: "src/**/*.graphql",

//   generates: {
//     "src/graphql": {
//       preset: "near-operation-file",
//       presetConfig: {
//         baseTypesPath: "types.ts",
//       },
//       plugins: ["typescript-operations", "typescript-react-apollo"],
//       config: {
//         withHooks: true,
//         withHOC: false,
//         withComponent: false,
//       },
//     },

//     "src/graphql/types.ts": {
//       plugins: ["typescript"],
//     },
//   },
// }

export default config
