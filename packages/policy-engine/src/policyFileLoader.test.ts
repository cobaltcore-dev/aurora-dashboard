import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fs from "fs"
import path from "path"
import { loadPolicyConfigFromFile } from "./policyFileLoader"

// Mock fs module
vi.mock("fs")
vi.mock("path")

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)

describe("policyConfigFileLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("loadPolicyConfigFromFile", () => {
    it("should throw error when file does not exist", () => {
      const filePath = "/path/to/nonexistent.json"
      mockFs.existsSync.mockReturnValue(false)

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow(`Policy file not found: ${filePath}`)
    })

    it("should successfully load and parse JSON file", () => {
      const filePath = "/path/to/config.json"
      const jsonContent = '{"key1": "value1", "key2": "value2"}'

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(jsonContent)
      mockPath.extname.mockReturnValue(".json")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key1: "value1", key2: "value2" })
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, "utf-8")
    })

    it("should successfully load and parse YAML file with .yaml extension", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = "key1: value1\nkey2: value2\n#fdsfdsfdsfds"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key1: "value1", key2: "value2" })
    })

    it("should successfully load and parse YAML file with .yml extension", () => {
      const filePath = "/path/to/config.yml"
      const yamlContent = "key1: value1\nkey2: value2"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key1: "value1", key2: "value2" })
    })

    it("should auto-detect JSON format when extension is unknown", () => {
      const filePath = "/path/to/config.txt"
      const jsonContent = '{"key1": "value1"}'

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(jsonContent)
      mockPath.extname.mockReturnValue(".txt")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key1: "value1" })
    })

    it("should fallback to YAML parsing when JSON auto-detection fails", () => {
      const filePath = "/path/to/config.txt"
      const yamlContent = "key1: value1"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".txt")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key1: "value1" })
    })

    it("should throw error when file cannot be parsed as JSON or YAML", () => {
      const filePath = "/path/to/invalid.json"
      const invalidContent = "invalid content"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(invalidContent)
      mockPath.extname.mockReturnValue(".json")

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow(/Failed to parse configuration file/)
    })

    it("should handle file read errors", () => {
      const filePath = "/path/to/config.json"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("Permission denied")
      })

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow("Permission denied")
    })
  })

  describe("JSON parsing", () => {
    it("should parse valid JSON", () => {
      const filePath = "/path/to/config.json"
      const jsonContent = '{"name": "test", "version": "1.0.0"}'

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(jsonContent)
      mockPath.extname.mockReturnValue(".json")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ name: "test", version: "1.0.0" })
    })

    it("should throw error for invalid JSON", () => {
      const filePath = "/path/to/invalid.json"
      const invalidJson = '{"name": "test"'

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(invalidJson)
      mockPath.extname.mockReturnValue(".json")

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow(
        /Failed to parse configuration file.*Invalid JSON format/
      )
    })

    it("should handle empty JSON object", () => {
      const filePath = "/path/to/empty.json"
      const emptyJson = "{}"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(emptyJson)
      mockPath.extname.mockReturnValue(".json")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({})
    })
  })

  describe("YAML parsing", () => {
    it("should parse simple key-value pairs", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = "name: test\nversion: 1.0.0\ndebug: true"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        name: "test",
        version: "1.0.0",
        debug: "true",
      })
    })

    it("should skip empty lines and comments", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `
# This is a comment
name: test

# Another comment
version: 1.0.0

`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ name: "test", version: "1.0.0" })
    })

    it("should handle quoted values", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `name: "quoted value"
description: 'single quoted'
path: "/usr/local/bin"`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        name: "quoted value",
        description: "single quoted",
        path: "/usr/local/bin",
      })
    })

    it("should handle boolean values as strings", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `enabled: true
disabled: false
mixed: TRUE
other: FALSE`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        enabled: "true",
        disabled: "false",
        mixed: "true",
        other: "false",
      })
    })

    it("should handle null and empty values", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `empty: 
nullValue: null
nullUpper: NULL
explicit: ""`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        nullValue: "",
        nullUpper: "",
        explicit: "",
      })
    })

    it("should skip lines without colons", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `name: test
invalid line without colon
version: 1.0.0`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ name: "test", version: "1.0.0" })
    })

    it("should throw error for empty keys", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = ": value without key"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow(
        /Failed to parse configuration file.*Invalid YAML: empty key on line 1/
      )
    })

    it("should throw error when no valid key-value pairs found", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `# Only comments
# No actual content

`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      expect(() => loadPolicyConfigFromFile(filePath)).toThrow(
        /Failed to parse configuration file.*No valid key-value pairs found in YAML content/
      )
    })

    it("should handle values with spaces", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `name: John Doe
description: This is a long description with spaces
path: /path/with spaces/file.txt`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        name: "John Doe",
        description: "This is a long description with spaces",
        path: "/path/with spaces/file.txt",
      })
    })

    it("should handle keys and values with extra whitespace", () => {
      const filePath = "/path/to/config.yaml"
      const yamlContent = `  name  :   test value   
   version:1.0.0`

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".yaml")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({
        name: "test value",
        version: "1.0.0",
      })
    })
  })

  describe("case sensitivity", () => {
    it("should handle case-insensitive file extensions", () => {
      const filePath = "/path/to/config.JSON"
      const jsonContent = '{"key": "value"}'

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(jsonContent)
      mockPath.extname.mockReturnValue(".JSON")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key: "value" })
    })

    it("should handle mixed case YAML extensions", () => {
      const filePath = "/path/to/config.YML"
      const yamlContent = "key: value"

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(yamlContent)
      mockPath.extname.mockReturnValue(".YML")

      const result = loadPolicyConfigFromFile(filePath)

      expect(result).toEqual({ key: "value" })
    })
  })
})
