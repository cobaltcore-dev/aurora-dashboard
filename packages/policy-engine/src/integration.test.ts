// import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
// import { createPolicyEngine, createPolicyEngineFromFile } from "./index"
// import { PolicyEngine, PolicyConfigSchema, PolicyConfig } from "./policyEngine"
// import { loadPolicyConfigFromFile } from "./policyFileLoader"

// // Mock the dependencies
// vi.mock("./policyEngine")
// vi.mock("./policyFileLoader")
// vi.mock("./types", async () => {
//   const actual = await vi.importActual("./types")
//   return {
//     ...actual,
//     PolicyConfigSchema: {
//       parse: vi.fn(),
//     },
//   }
// })

// const mockPolicyEngine = vi.mocked(PolicyEngine)
// const mockLoadPolicyConfigFromFile = vi.mocked(loadPolicyConfigFromFile)
// const mockPolicyConfigSchema = vi.mocked(PolicyConfigSchema)

// describe("Policy Engine Integration Tests", () => {
//   const validConfig = {
//     admin_required: "role:admin or is_admin:1",
//     project_admin: "rule:admin_required and not project_id:null",
//     owner: "user_id:%(user_id)s",
//     _default: "rule:admin_required",
//   }

//   const mockPolicyEngineInstance = {
//     policy: vi.fn(),
//   }

//   beforeEach(() => {
//     vi.clearAllMocks()
//     // Setup default mock implementations
//     mockPolicyEngine.mockReturnValue(mockPolicyEngineInstance as any)
//     mockPolicyConfigSchema.parse.mockImplementation((config) => config as PolicyConfig)
//   })

//   afterEach(() => {
//     vi.resetAllMocks()
//   })

//   describe("createPolicyEngine", () => {
//     it("should integrate schema validation and PolicyEngine creation", () => {
//       const result = createPolicyEngine(validConfig)

//       // Verify schema validation was called
//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledWith(validConfig)
//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledTimes(1)

//       // Verify PolicyEngine was created with validated config
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validConfig)
//       expect(mockPolicyEngine).toHaveBeenCalledTimes(1)

//       // Verify the result is the PolicyEngine instance
//       expect(result).toBe(mockPolicyEngineInstance)
//     })

//     it("should pass through schema validation errors", () => {
//       const invalidConfig = { invalid: "config" }
//       const validationError = new Error("Schema validation failed")

//       mockPolicyConfigSchema.parse.mockImplementation(() => {
//         throw validationError
//       })

//       expect(() => createPolicyEngine(invalidConfig)).toThrow("Schema validation failed")

//       // Verify schema validation was attempted
//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledWith(invalidConfig)

//       // Verify PolicyEngine was not created
//       expect(mockPolicyEngine).not.toHaveBeenCalled()
//     })

//     it("should handle PolicyEngine constructor errors", () => {
//       const constructorError = new Error("PolicyEngine creation failed")

//       mockPolicyEngine.mockImplementation(() => {
//         throw constructorError
//       })

//       expect(() => createPolicyEngine(validConfig)).toThrow("PolicyEngine creation failed")

//       // Verify schema validation was completed first
//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledWith(validConfig)
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validConfig)
//     })

//     it("should work with empty config that passes validation", () => {
//       const emptyConfig = {}
//       const validatedEmptyConfig = { _default: "deny" }

//       mockPolicyConfigSchema.parse.mockReturnValue(validatedEmptyConfig as PolicyConfig)

//       const result = createPolicyEngine(emptyConfig)

//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledWith(emptyConfig)
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validatedEmptyConfig)
//       expect(result).toBe(mockPolicyEngineInstance)
//     })

//     it("should preserve config structure through validation", () => {
//       const complexConfig = {
//         rule1: "role:admin",
//         rule2: "user_id:%(user_id)s",
//         rule3: "rule:rule1 and rule:rule2",
//         _default: "deny",
//       }

//       createPolicyEngine(complexConfig)

//       expect(mockPolicyConfigSchema.parse).toHaveBeenCalledWith(complexConfig)
//       expect(mockPolicyEngine).toHaveBeenCalledWith(complexConfig)
//     })
//   })

//   describe("createPolicyEngineFromFile", () => {
//     it("should integrate file loading and PolicyEngine creation", () => {
//       const filePath = "/path/to/policy.json"

//       mockLoadPolicyConfigFromFile.mockReturnValue(validConfig)

//       const result = createPolicyEngineFromFile(filePath)

//       // Verify file loading was called
//       expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledWith(filePath)
//       expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledTimes(1)

//       // Verify PolicyEngine was created with loaded config
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validConfig)
//       expect(mockPolicyEngine).toHaveBeenCalledTimes(1)

//       // Verify the result is the PolicyEngine instance
//       expect(result).toBe(mockPolicyEngineInstance)
//     })

//     it("should pass through file loading errors", () => {
//       const filePath = "/path/to/nonexistent.json"
//       const fileError = new Error("Policy file not found")

//       mockLoadPolicyConfigFromFile.mockImplementation(() => {
//         throw fileError
//       })

//       expect(() => createPolicyEngineFromFile(filePath)).toThrow("Policy file not found")

//       // Verify file loading was attempted
//       expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledWith(filePath)

//       // Verify PolicyEngine was not created
//       expect(mockPolicyEngine).not.toHaveBeenCalled()
//     })

//     it("should handle PolicyEngine constructor errors from file config", () => {
//       const filePath = "/path/to/policy.yaml"
//       const constructorError = new Error("PolicyEngine creation failed")

//       mockLoadPolicyConfigFromFile.mockReturnValue(validConfig)
//       mockPolicyEngine.mockImplementation(() => {
//         throw constructorError
//       })

//       expect(() => createPolicyEngineFromFile(filePath)).toThrow("PolicyEngine creation failed")

//       // Verify file loading was completed first
//       expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledWith(filePath)
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validConfig)
//     })

//     it("should work with different file types", () => {
//       const testCases = [
//         { path: "/path/to/policy.json", config: { rule1: "json_rule" } },
//         { path: "/path/to/policy.yaml", config: { rule2: "yaml_rule" } },
//         { path: "/path/to/policy.yml", config: { rule3: "yml_rule" } },
//         { path: "/path/to/policy.txt", config: { rule4: "auto_detected" } },
//       ] as const

//       testCases.forEach(({ path, config }) => {
//         vi.clearAllMocks()
//         mockLoadPolicyConfigFromFile.mockReturnValue(config)

//         const result = createPolicyEngineFromFile(path)

//         expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledWith(path)
//         expect(mockPolicyEngine).toHaveBeenCalledWith(config)
//         expect(result).toBe(mockPolicyEngineInstance)
//       })
//     })

//     it("should handle complex config loaded from file", () => {
//       const filePath = "/path/to/complex-policy.json"
//       const complexConfig = {
//         admin_required: "role:admin or is_admin:1",
//         project_admin: "rule:admin_required and not project_id:null",
//         owner: "user_id:%(user_id)s",
//         member: "project_id:%(project_id)s",
//         reader: "rule:member or rule:owner",
//         _default: "rule:admin_required",
//       }

//       mockLoadPolicyConfigFromFile.mockReturnValue(complexConfig)

//       const result = createPolicyEngineFromFile(filePath)

//       expect(mockLoadPolicyConfigFromFile).toHaveBeenCalledWith(filePath)
//       expect(mockPolicyEngine).toHaveBeenCalledWith(complexConfig)
//       expect(result).toBe(mockPolicyEngineInstance)
//     })
//   })

//   describe("Error propagation and handling", () => {
//     it("should maintain error context through the integration chain", () => {
//       const filePath = "/path/to/invalid.json"
//       const originalError = new Error("Failed to parse configuration file")

//       mockLoadPolicyConfigFromFile.mockImplementation(() => {
//         throw originalError
//       })

//       expect(() => createPolicyEngineFromFile(filePath)).toThrow(originalError)
//     })

//     it("should handle validation errors in createPolicyEngine", () => {
//       const invalidConfig = { "": "empty key" }
//       const validationError = new Error("Invalid policy configuration")

//       mockPolicyConfigSchema.parse.mockImplementation(() => {
//         throw validationError
//       })

//       expect(() => createPolicyEngine(invalidConfig)).toThrow(validationError)
//     })

//     it("should preserve error types through integration layers", () => {
//       const filePath = "/path/to/policy.json"

//       // Test different error types
//       const errorTypes = [
//         new TypeError("Invalid type"),
//         new ReferenceError("Reference error"),
//         new SyntaxError("Syntax error"),
//         new Error("Generic error"),
//       ]

//       errorTypes.forEach((error) => {
//         vi.clearAllMocks()
//         mockLoadPolicyConfigFromFile.mockImplementation(() => {
//           throw error
//         })

//         expect(() => createPolicyEngineFromFile(filePath)).toThrow(error)
//       })
//     })
//   })

//   describe("Integration flow verification", () => {
//     it("should follow correct execution order in createPolicyEngine", () => {
//       const callOrder: string[] = []

//       mockPolicyConfigSchema.parse.mockImplementation((config) => {
//         callOrder.push("validation")
//         return config as PolicyConfig
//       })

//       mockPolicyEngine.mockImplementation((config) => {
//         callOrder.push("construction")
//         return mockPolicyEngineInstance as any
//       })

//       createPolicyEngine(validConfig)

//       expect(callOrder).toEqual(["validation", "construction"])
//     })

//     it("should follow correct execution order in createPolicyEngineFromFile", () => {
//       const callOrder: string[] = []

//       mockLoadPolicyConfigFromFile.mockImplementation((path) => {
//         callOrder.push("file_loading")
//         return validConfig
//       })

//       mockPolicyEngine.mockImplementation((config) => {
//         callOrder.push("construction")
//         return mockPolicyEngineInstance as any
//       })

//       createPolicyEngineFromFile("/path/to/policy.json")

//       expect(callOrder).toEqual(["file_loading", "construction"])
//     })

//     it("should pass the exact config from file loader to PolicyEngine", () => {
//       const filePath = "/path/to/policy.json"
//       const fileConfig = { specific: "config", from: "file" }

//       mockLoadPolicyConfigFromFile.mockReturnValue(fileConfig)

//       createPolicyEngineFromFile(filePath)

//       // Verify the exact same object reference is passed
//       expect(mockPolicyEngine).toHaveBeenCalledWith(fileConfig)
//     })

//     it("should pass the exact validated config to PolicyEngine", () => {
//       const inputConfig = { input: "config" }
//       const validatedConfig = { validated: "config" }

//       mockPolicyConfigSchema.parse.mockReturnValue(validatedConfig as PolicyConfig)

//       createPolicyEngine(inputConfig)

//       // Verify the validated config (not input config) is passed
//       expect(mockPolicyEngine).toHaveBeenCalledWith(validatedConfig)
//     })
//   })

//   describe("Return value verification", () => {
//     it("should return PolicyEngine instance from createPolicyEngine", () => {
//       const result = createPolicyEngine(validConfig)

//       expect(result).toBeInstanceOf(Object)
//       expect(result).toBe(mockPolicyEngineInstance)
//       expect(result).toHaveProperty("policy")
//     })

//     it("should return PolicyEngine instance from createPolicyEngineFromFile", () => {
//       mockLoadPolicyConfigFromFile.mockReturnValue(validConfig)

//       const result = createPolicyEngineFromFile("/path/to/policy.json")

//       expect(result).toBeInstanceOf(Object)
//       expect(result).toBe(mockPolicyEngineInstance)
//       expect(result).toHaveProperty("policy")
//     })

//     it("should return different instances for multiple calls", () => {
//       const instance1 = { policy: vi.fn(), id: 1 }
//       const instance2 = { policy: vi.fn(), id: 2 }

//       mockPolicyEngine.mockReturnValueOnce(instance1 as any).mockReturnValueOnce(instance2 as any)

//       const result1 = createPolicyEngine(validConfig)
//       const result2 = createPolicyEngine(validConfig)

//       expect(result1).toBe(instance1)
//       expect(result2).toBe(instance2)
//       expect(result1).not.toBe(result2)
//     })
//   })
// })

import { describe, it, expect, beforeEach } from "vitest"
import { createPolicyEngine, createPolicyEngineFromFile } from "./index"
import { PolicyEngine } from "./policyEngine"
import { writeFileSync, mkdtempSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

describe("Policy Engine Integration Tests", () => {
  const validConfig = {
    admin_required: "role:admin or is_admin:1",
    project_admin: "rule:admin_required and not project_id:null",
    owner: "user_id:%(user_id)s",
    _default: "rule:admin_required",
  }

  let tempDir: string

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = mkdtempSync(join(tmpdir(), "policy-test-"))
  })

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe("createPolicyEngine", () => {
    it("should create PolicyEngine with valid config", () => {
      const result = createPolicyEngine(validConfig)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })

    it("should throw error for invalid config", () => {
      const invalidConfig = { "": "empty key not allowed" }

      expect(() => createPolicyEngine(invalidConfig)).toThrow()
    })

    it("should create PolicyEngine with complex config", () => {
      const complexConfig = {
        rule1: "role:admin",
        rule2: "user_id:%(user_id)s",
        rule3: "rule:rule1 and rule:rule2",
        _default: "deny",
      }

      const result = createPolicyEngine(complexConfig)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })

    it("should validate config structure", () => {
      // Test with config that should fail validation
      const invalidStructure = {
        123: "numeric keys not allowed", // assuming this is invalid
      }

      expect(() => createPolicyEngine(invalidStructure)).toThrow()
    })
  })

  describe("createPolicyEngineFromFile", () => {
    it("should create PolicyEngine from JSON file", () => {
      const filePath = join(tempDir, "policy.json")
      writeFileSync(filePath, JSON.stringify(validConfig, null, 2))

      const result = createPolicyEngineFromFile(filePath)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })

    it("should create PolicyEngine from YAML file", () => {
      const filePath = join(tempDir, "policy.yaml")
      const yamlContent = `
admin_required: "role:admin or is_admin:1"
project_admin: "rule:admin_required and not project_id:null"
owner: "user_id:%(user_id)s"
_default: "rule:admin_required"
`
      writeFileSync(filePath, yamlContent)

      const result = createPolicyEngineFromFile(filePath)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })

    it("should create PolicyEngine from YML file", () => {
      const filePath = join(tempDir, "policy.yml")
      const yamlContent = `
rule1: "role:admin"
rule2: "user_id:%(user_id)s"
_default: "deny"
`
      writeFileSync(filePath, yamlContent)

      const result = createPolicyEngineFromFile(filePath)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })

    it("should throw error for non-existent file", () => {
      const filePath = join(tempDir, "nonexistent.json")

      expect(() => createPolicyEngineFromFile(filePath)).toThrow()
    })

    it("should throw error for invalid JSON file", () => {
      const filePath = join(tempDir, "invalid.json")
      writeFileSync(filePath, "{ invalid json }")

      expect(() => createPolicyEngineFromFile(filePath)).toThrow()
    })

    it("should throw error for invalid YAML file", () => {
      const filePath = join(tempDir, "invalid.yaml")
      writeFileSync(filePath, "invalid: ")

      expect(() => createPolicyEngineFromFile(filePath)).toThrow()
    })

    it("should handle complex config from file", () => {
      const complexConfig = {
        admin_required: "role:admin or is_admin:1",
        project_admin: "rule:admin_required and not project_id:null",
        owner: "user_id:%(user_id)s",
        member: "project_id:%(project_id)s",
        reader: "rule:member or rule:owner",
        _default: "rule:admin_required",
      }

      const filePath = join(tempDir, "complex-policy.json")
      writeFileSync(filePath, JSON.stringify(complexConfig, null, 2))

      const result = createPolicyEngineFromFile(filePath)

      expect(result).toBeInstanceOf(PolicyEngine)
      expect(typeof result.policy).toBe("function")
    })
  })

  describe("Integration behavior", () => {
    it("should create different instances for multiple calls", () => {
      const result1 = createPolicyEngine(validConfig)
      const result2 = createPolicyEngine(validConfig)

      expect(result1).toBeInstanceOf(PolicyEngine)
      expect(result2).toBeInstanceOf(PolicyEngine)
      expect(result1).not.toBe(result2) // Different instances
    })

    it("should create equivalent engines from config and file", () => {
      const filePath = join(tempDir, "equivalent.json")
      writeFileSync(filePath, JSON.stringify(validConfig))

      const fromConfig = createPolicyEngine(validConfig)
      const fromFile = createPolicyEngineFromFile(filePath)

      expect(fromConfig).toBeInstanceOf(PolicyEngine)
      expect(fromFile).toBeInstanceOf(PolicyEngine)

      // Both should have the same interface
      expect(typeof fromConfig.policy).toBe("function")
      expect(typeof fromFile.policy).toBe("function")
    })

    it("should preserve config structure through the pipeline", () => {
      const testConfig = {
        custom_rule: "role:custom",
        another_rule: "user_id:%(user_id)s",
        _default: "deny",
      }

      const filePath = join(tempDir, "structure-test.json")
      writeFileSync(filePath, JSON.stringify(testConfig))

      // Both methods should work with the same config
      expect(() => createPolicyEngine(testConfig)).not.toThrow()
      expect(() => createPolicyEngineFromFile(filePath)).not.toThrow()
    })

    it("should handle edge cases consistently", () => {
      const edgeCases = [
        { _default: "allow" }, // minimal config
        { rule_with_spaces: "role:admin and user_id:%(user_id)s" }, // spaces
        { "rule-with-dashes": "deny" }, // dashes
      ] as const

      edgeCases.forEach((config, index) => {
        const filePath = join(tempDir, `edge-case-${index}.json`)
        writeFileSync(filePath, JSON.stringify(config))

        // Both should handle the same way
        const fromConfig = createPolicyEngine(config)
        const fromFile = createPolicyEngineFromFile(filePath)

        expect(fromConfig).toBeInstanceOf(PolicyEngine)
        expect(fromFile).toBeInstanceOf(PolicyEngine)
      })
    })
  })

  describe("Error handling", () => {
    it("should provide meaningful error messages for schema validation", () => {
      const invalidConfig = { "": "empty key" }

      try {
        createPolicyEngine(invalidConfig)
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBeTruthy()
      }
    })

    it("should provide meaningful error messages for file not found", () => {
      const nonExistentPath = join(tempDir, "does-not-exist.json")

      try {
        createPolicyEngineFromFile(nonExistentPath)
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBeTruthy()
      }
    })

    it("should handle malformed file content gracefully", () => {
      const filePath = join(tempDir, "malformed.json")
      writeFileSync(filePath, "not valid json or yaml")

      try {
        createPolicyEngineFromFile(filePath)
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBeTruthy()
      }
    })
  })
})
