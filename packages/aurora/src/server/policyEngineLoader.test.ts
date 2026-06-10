import { describe, it, expect, beforeEach, vi } from "vitest"
import fs from "fs"
import path from "path"
import { loadPolicyEngine } from "./policyEngineLoader"
import { createPolicyEngineFromFile } from "@cobaltcore-dev/policy-engine"

vi.mock("fs", () => ({
  default: { existsSync: vi.fn() },
  existsSync: vi.fn(),
}))
vi.mock("path", () => ({
  default: { join: vi.fn(), isAbsolute: vi.fn() },
  join: vi.fn(),
  isAbsolute: vi.fn(),
}))
vi.mock("@cobaltcore-dev/policy-engine")

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)
const mockCreatePolicyEngineFromFile = vi.mocked(createPolicyEngineFromFile)

describe("loadPolicyEngine", () => {
  const mockPolicyEngine = { mock: "policyEngine" }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPath.join.mockImplementation((...args) => args.join("/").replace(/\/+/g, "/"))
    mockPath.isAbsolute.mockReturnValue(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreatePolicyEngineFromFile.mockReturnValue(mockPolicyEngine as any)
  })

  describe("when consumer dir is supplied and file exists there", () => {
    it("should load from consumer dir first", () => {
      mockFs.existsSync.mockImplementation((p) => String(p).includes("/consumer/"))
      const result = loadPolicyEngine("compute.yaml", "/consumer/policies")

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("/consumer/policies/compute.yaml")
      )
      expect(result).toBe(mockPolicyEngine)
    })

    it("should not fall through to custom_policies when consumer file exists", () => {
      mockFs.existsSync.mockImplementation((p) => String(p).includes("/consumer/"))
      loadPolicyEngine("compute.yaml", "/consumer/policies")

      const calledWith = mockCreatePolicyEngineFromFile.mock.calls[0][0]
      expect(calledWith).toContain("/consumer/policies/compute.yaml")
      expect(calledWith).not.toContain("permission_custom_policies")
    })
  })

  describe("when consumer dir is supplied but file is absent", () => {
    it("should fall through to permission_custom_policies when it exists", () => {
      mockFs.existsSync.mockImplementation((p) => String(p).includes("permission_custom_policies"))
      loadPolicyEngine("compute.yaml", "/consumer/policies")

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/compute.yaml")
      )
    })

    it("should throw when no candidate exists", () => {
      mockFs.existsSync.mockReturnValue(false)

      expect(() => loadPolicyEngine("compute.yaml", "/consumer/policies")).toThrow(
        'Policy file "compute.yaml" not found'
      )
    })
  })

  describe("when no consumer dir is supplied", () => {
    it("should load from permission_custom_policies when it exists", () => {
      mockFs.existsSync.mockReturnValue(true)
      const result = loadPolicyEngine("test-policy.yaml")

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/test-policy.yaml")
      )
      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledWith(
        expect.stringContaining("permission_custom_policies/test-policy.yaml")
      )
      expect(result).toBe(mockPolicyEngine)
    })

    it("should throw when permission_custom_policies file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false)

      expect(() => loadPolicyEngine("test-policy.yaml")).toThrow('Policy file "test-policy.yaml" not found')
    })

    it("should include searched paths in the error message", () => {
      mockFs.existsSync.mockReturnValue(false)

      expect(() => loadPolicyEngine("compute.yaml", "/my/dir")).toThrow("policyDir option")
    })
  })

  describe("path construction", () => {
    it("should check consumerDir before permission_custom_policies", () => {
      mockFs.existsSync.mockReturnValue(true)
      loadPolicyEngine("test.yaml", "/consumer/dir")

      const calls = mockPath.join.mock.calls.map((c) => c.join("/"))
      const consumerIdx = calls.findIndex((c) => c.includes("/consumer/dir"))
      const customIdx = calls.findIndex((c) => c.includes("permission_custom_policies"))
      expect(consumerIdx).toBeLessThan(customIdx)
    })

    it("should only call createPolicyEngineFromFile once", () => {
      mockFs.existsSync.mockReturnValue(true)
      loadPolicyEngine("test.yaml")

      expect(mockCreatePolicyEngineFromFile).toHaveBeenCalledTimes(1)
    })

    it("should return the result from createPolicyEngineFromFile", () => {
      mockFs.existsSync.mockReturnValue(true)
      const mockEngine = { custom: "engine", rules: [] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreatePolicyEngineFromFile.mockReturnValue(mockEngine as any)

      expect(loadPolicyEngine("test.yaml")).toBe(mockEngine)
    })
  })

  describe("error handling", () => {
    it("should throw when consumerDir is a relative path", () => {
      mockPath.isAbsolute.mockReturnValue(false)
      expect(() => loadPolicyEngine("compute.yaml", "./relative/path")).toThrow("policyDir must be an absolute path")
    })

    it("should propagate errors from createPolicyEngineFromFile", () => {
      mockFs.existsSync.mockReturnValue(true)
      mockCreatePolicyEngineFromFile.mockImplementation(() => {
        throw new Error("Failed to create policy engine")
      })

      expect(() => loadPolicyEngine("test.yaml")).toThrow("Failed to create policy engine")
    })

    it("should propagate errors from fs.existsSync", () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error("Permission denied")
      })

      expect(() => loadPolicyEngine("test.yaml")).toThrow("Permission denied")
    })
  })
})
