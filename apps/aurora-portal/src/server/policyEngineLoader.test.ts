import { describe, it, expect, beforeEach, vi } from "vitest"
import fs from "fs"
import path from "path"
import { loadPolicyEngine } from "./policyEngineLoader" // adjust path as needed
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

// Mock the dependencies
vi.mock("fs")
vi.mock("path")
vi.mock("@cobaltcore-dev/policy-engine")

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)
const mockCreatePolicyEngineFromFile = vi.mocked(createPolicyEngineFromFile)

describe("loadPolicyEngine", () => {
  const mockPolicyEngine = { mock: "policyEngine" }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup more realistic path.join behavior that matches Node.js behavior
    mockPath.join.mockImplementation((...args) => {
      return args.join("/").replace(/\/+/g, "/") // normalize multiple slashes
    })

    // Setup default createPolicyEngineFromFile behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreatePolicyEngineFromFile.mockReturnValue(mockPolicyEngine as any)
  })

  describe("when custom policy file exists", () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true)
    })

    it("should load from custom policies folder", () => {
      const fileName = "test-policy.yaml"
      const result = loadPolicyEngine(fileName)

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/test-policy.yaml")
      )
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/test-policy.yaml")
      )
      expect(result).toBe(mockPolicyEngine)
    })

    it("should use correct path for custom policy", () => {
      const fileName = "custom-rules.json"
      loadPolicyEngine(fileName)

      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String), // __dirname
        `./permission_custom_policies/${fileName}`
      )
    })

    it("should handle different file extensions", () => {
      const testCases = ["policy.yaml", "rules.json", "config.yml", "permissions.txt"]

      testCases.forEach((fileName) => {
        mockCreatePolicyEngineFromFile.mockClear() // Clear between iterations
        loadPolicyEngine(fileName)
        expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
          expect.stringContaining(`permission_custom_policies/${fileName}`)
        )
      })
    })
  })

  describe("when custom policy file does not exist", () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false)
    })

    it("should load from default policies folder", () => {
      const fileName = "default-policy.yaml"
      const result = loadPolicyEngine(fileName)

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/default-policy.yaml")
      )
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("permission_policies/default-policy.yaml")
      )
      expect(result).toBe(mockPolicyEngine)
    })

    it("should use correct path for default policy", () => {
      const fileName = "standard-rules.json"
      loadPolicyEngine(fileName)

      // Should check custom first
      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), `./permission_custom_policies/${fileName}`)

      // Then use default
      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), `./permission_policies/${fileName}`)
    })

    it("should handle different file extensions for default policies", () => {
      const testCases = ["policy.yaml", "rules.json", "config.yml", "permissions.txt"]

      testCases.forEach((fileName) => {
        mockCreatePolicyEngineFromFile.mockClear() // Clear between iterations
        loadPolicyEngine(fileName)
        expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
          expect.stringContaining(`permission_policies/${fileName}`)
        )
      })
    })
  })

  describe("path construction", () => {
    it("should construct paths relative to __dirname", () => {
      mockFs.existsSync.mockReturnValue(false)
      const fileName = "test.yaml"

      loadPolicyEngine(fileName)

      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String), // __dirname
        "./permission_custom_policies/test.yaml"
      )
      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String), // __dirname
        "./permission_policies/test.yaml"
      )
    })

    it("should handle filenames with special characters", () => {
      mockFs.existsSync.mockReturnValue(false)
      const fileName = "policy-with-dashes_and_underscores.yaml"

      loadPolicyEngine(fileName)

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining(`permission_policies/${fileName}`)
      )
    })

    it("should handle filenames with no extension", () => {
      mockFs.existsSync.mockReturnValue(true)
      const fileName = "policy"

      loadPolicyEngine(fileName)

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining(`permission_custom_policies/${fileName}`)
      )
    })
  })

  describe("error handling", () => {
    it("should propagate errors from createPolicyEngineFromFile", () => {
      mockFs.existsSync.mockReturnValue(false)
      const error = new Error("Failed to create policy engine")
      mockCreatePolicyEngineFromFile.mockImplementation(() => {
        throw error
      })

      expect(() => loadPolicyEngine("test.yaml")).toThrow("Failed to create policy engine")
    })

    it("should propagate errors from fs.existsSync", () => {
      const error = new Error("Permission denied")
      mockFs.existsSync.mockImplementation(() => {
        throw error
      })

      expect(() => loadPolicyEngine("test.yaml")).toThrow("Permission denied")
    })
  })

  describe("call order and behavior", () => {
    it("should always check custom policies first", () => {
      mockFs.existsSync.mockReturnValue(false)

      loadPolicyEngine("test.yaml")

      // Verify existsSync was called before createPolicyEngineFromFile
      expect(mockFs.existsSync).toHaveBeenCalledBefore(mockCreatePolicyEngineFromFile)
    })

    it("should only call createPolicyEngineFromFile once", () => {
      mockFs.existsSync.mockReturnValue(true)

      loadPolicyEngine("test.yaml")

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledTimes(1)
    })

    it("should return the result from createPolicyEngineFromFile", () => {
      mockFs.existsSync.mockReturnValue(false)
      const mockEngine = { custom: "engine", rules: [] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreatePolicyEngineFromFile.mockReturnValue(mockEngine as any)

      const result = loadPolicyEngine("test.yaml")

      expect(result).toBe(mockEngine)
    })
  })

  describe("integration scenarios", () => {
    it("should handle the complete flow for custom policy", () => {
      mockFs.existsSync.mockReturnValue(true)
      const fileName = "admin-policy.yaml"

      const result = loadPolicyEngine(fileName)

      // Check that existsSync was called with the custom path
      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining(`permission_custom_policies/${fileName}`))

      // Check that createPolicyEngineFromFile was called with the custom path
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining(`permission_custom_policies/${fileName}`)
      )

      expect(result).toBe(mockPolicyEngine)
    })

    it("should handle the complete flow for default policy", () => {
      mockFs.existsSync.mockReturnValue(false)
      const fileName = "admin-policy.yaml"

      const result = loadPolicyEngine(fileName)

      // Check that existsSync was called with the custom path first
      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining(`permission_custom_policies/${fileName}`))

      // Check that createPolicyEngineFromFile was called with the default path
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining(`permission_policies/${fileName}`)
      )

      expect(result).toBe(mockPolicyEngine)
    })

    it("should use exact paths when mocked specifically", () => {
      const fileName = "test-policy.yaml"
      const customPath = "/mocked/custom/path"
      const defaultPath = "/mocked/default/path"

      // Mock specific return values for path.join
      mockPath.join
        .mockReturnValueOnce(customPath) // for custom path check
        .mockReturnValueOnce(defaultPath) // for default path

      mockFs.existsSync.mockReturnValue(false) // custom doesn't exist

      loadPolicyEngine(fileName)

      expect(mockFs.existsSync).toHaveBeenCalledWith(customPath)
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(defaultPath)
    })
  })

  describe("edge cases", () => {
    it("should handle empty filename", () => {
      mockFs.existsSync.mockReturnValue(false)
      const fileName = ""

      loadPolicyEngine(fileName)

      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), "./permission_custom_policies/")
      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), "./permission_policies/")
    })

    it("should handle filename with only extension", () => {
      mockFs.existsSync.mockReturnValue(true)
      const fileName = ".yaml"

      loadPolicyEngine(fileName)

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/.yaml")
      )
    })

    it("should handle filename with path separators", () => {
      mockFs.existsSync.mockReturnValue(false)
      const fileName = "subfolder/policy.yaml"

      loadPolicyEngine(fileName)

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining(`permission_policies/${fileName}`)
      )
    })
  })
})
