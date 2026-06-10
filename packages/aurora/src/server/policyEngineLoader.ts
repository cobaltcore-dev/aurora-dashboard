import path from "path"
import fs from "fs"
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

/**
 * Load a policy engine for the given file name.
 *
 * Resolution order (first match wins):
 *   1. `consumerDir/<fileName>` – caller-supplied policy directory (required)
 *   2. `permission_custom_policies/<fileName>` – legacy in-tree override directory
 *
 * @param fileName    Policy file name to resolve and load (e.g. "compute.yaml").
 * @param consumerDir Absolute path to the consumer-supplied policy directory.
 * @returns Policy engine instance created from the resolved policy file.
 */
export const loadPolicyEngine = (fileName: string, consumerDir?: string) => {
  const candidates: string[] = []

  if (consumerDir) {
    candidates.push(path.join(consumerDir, fileName))
  }

  candidates.push(path.join(__dirname, `../../permission_custom_policies/${fileName}`))

  const file = candidates.find((p) => fs.existsSync(p))

  if (!file) {
    throw new Error(
      `Policy file "${fileName}" not found. Searched:\n${candidates.map((p) => `  ${p}`).join("\n")}\nPass an absolute path via the policyDir option in createServer.`
    )
  }

  return createPolicyEngineFromFile(file)
}
