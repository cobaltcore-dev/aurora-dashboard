import path from "path"
import fs from "fs"
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

/**
 * Load a policy engine, preferring a same-named file from permission_custom_policies
 * and falling back to permission_policies when no override exists.
 *
 * @param fileName Policy file name to resolve and load.
 * @returns Policy engine instance created from the resolved policy file.
 */
export const loadPolicyEngine = (fileName: string) => {
  const customPath = path.join(__dirname, `../../permission_custom_policies/${fileName}`)
  const defaultPath = path.join(__dirname, `../../permission_policies/${fileName}`)

  const file = fs.existsSync(customPath) ? customPath : defaultPath
  return createPolicyEngineFromFile(file)
}
