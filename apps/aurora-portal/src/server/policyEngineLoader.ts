import path from "path"
import fs from "fs"
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

// support custom policy overrides by checking if a file exists in the permission_custom_policies folder
export const loadPolicyEngine = (fileName: string) => {
  let file: string
  if (fs.existsSync(path.join(__dirname, `./permission_custom_policies/${fileName}`))) {
    file = path.join(__dirname, `./permission_custom_policies/${fileName}`)
  } else {
    file = path.join(__dirname, `./permission_policies/${fileName}`)
  }
  return createPolicyEngineFromFile(file)
}
