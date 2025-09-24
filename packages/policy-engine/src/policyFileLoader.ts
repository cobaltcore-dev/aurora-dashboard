import fs from "fs"
import path from "path"

export function loadPolicyConfigFromFile(policyFilePath: string): Record<string, string> {
  if (!fs.existsSync(policyFilePath)) {
    throw new Error(`Policy file not found: ${policyFilePath}`)
  }

  const policyText = fs.readFileSync(policyFilePath, "utf-8")
  const fileExtension = path.extname(policyFilePath).toLowerCase()

  try {
    const parsedConfig = parseConfigFile(policyText, fileExtension)
    return parsedConfig
  } catch (error) {
    throw new Error(
      `Failed to parse configuration file "${policyFilePath}": ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

function parseConfigFile(content: string, fileExtension: string): Record<string, string> {
  switch (fileExtension) {
    case ".json":
      return parseJson(content)

    case ".yaml":
    case ".yml":
      return parseSimpleYaml(content)

    default:
      // Try to auto-detect format
      try {
        return parseJson(content)
      } catch {
        return parseSimpleYaml(content)
      }
  }
}

function parseJson(content: string): Record<string, string> {
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and full-line comments
    if (!line || line.startsWith("#")) {
      continue
    }

    // Find the colon that separates key from value (look for ": " pattern)
    const colonSpaceIndex = line.indexOf(": ")
    if (colonSpaceIndex === -1) {
      // Fallback: look for colon at end of key (no space)
      const colonIndex = line.indexOf(":")
      if (colonIndex === -1) {
        continue
      }
      // Check if there's content after the colon
      const afterColon = line.substring(colonIndex + 1).trim()
      if (!afterColon) {
        continue
      }
    }

    const separatorIndex = colonSpaceIndex !== -1 ? colonSpaceIndex : line.indexOf(":")
    let key = line.substring(0, separatorIndex).trim()
    let value = line.substring(separatorIndex + 1).trim()

    // Remove inline comments 
    const hashIndex = value.indexOf("#")
    if (hashIndex !== -1) {
      const beforeHash = value.substring(0, hashIndex)
      const quoteCount = (beforeHash.match(/"/g) || []).length
      if (quoteCount % 2 === 0) {
        value = value.substring(0, hashIndex).trim()
      }
    }

    // Remove quotes from KEY 
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1)
    }

    // Remove quotes from VALUE 
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    // Validate key is not empty
    if (!key) {
      throw new Error(`Invalid YAML: empty key on line ${i + 1}`)
    }

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    // Handle boolean and null values as strings
    if (value.toLowerCase() === "true") {
      value = "true"
    } else if (value.toLowerCase() === "false") {
      value = "false"
    } else if (value.toLowerCase() === "null" || value === "") {
      value = ""
    }

    result[key] = value
  }

  if (Object.keys(result).length === 0) {
    throw new Error("No valid key-value pairs found in YAML content")
  }

  return result
}
