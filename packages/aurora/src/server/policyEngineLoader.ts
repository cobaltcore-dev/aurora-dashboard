import path from "path"
import fs from "fs"
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

/**
 * Load a policy engine for the given file name.
 *
 * Resolution order (first match wins):
 *   1. `consumerDir/<fileName>` – caller-supplied override directory
 *   2. `permission_custom_policies/<fileName>` – legacy in-tree override directory
 *   3. `permission_policies/<fileName>` – built-in bundled policies
 *
 * @param fileName    Policy file name to resolve and load (e.g. "compute.yaml").
 * @param consumerDir Optional absolute path to a consumer-supplied policy directory.
 * @returns Policy engine instance created from the resolved policy file.
 */
export const loadPolicyEngine = (fileName: string, consumerDir?: string) => {
  const candidates: string[] = []

  if (consumerDir) {
    candidates.push(path.join(consumerDir, fileName))
  }

  candidates.push(path.join(__dirname, `../../permission_custom_policies/${fileName}`))
  candidates.push(path.join(__dirname, `../../permission_policies/${fileName}`))

  const file = candidates.find((p) => fs.existsSync(p)) ?? candidates[candidates.length - 1]
  return createPolicyEngineFromFile(file)
}
