import { describe, it, expect, beforeAll } from "vitest"
import { validateField, FlavorFormField, cleanFlavorData } from "./flavorValidation"
import { i18n } from "@lingui/core"
import { MessageDescriptor } from "@lingui/core"

describe("flavorValidation", () => {
  beforeAll(async () => {
    i18n.activate("en")
  })

  const mockT = (descriptor: MessageDescriptor) => descriptor.message || ""

  describe("validateField", () => {
    describe("id validation", () => {
      it("should return undefined for empty id (optional field)", () => {
        expect(validateField("id", "", mockT)).toBeUndefined()
        expect(validateField("id", null, mockT)).toBeUndefined()
        expect(validateField("id", undefined, mockT)).toBeUndefined()
      })
      it("should accept valid id formats", () => {
        expect(validateField("id", "valid-id_123", mockT)).toBeUndefined()
        expect(validateField("id", "test.flavor", mockT)).toBeUndefined()
        expect(validateField("id", "simple", mockT)).toBeUndefined()
        expect(validateField("id", "TEST_FLAVOR-2.0", mockT)).toBeUndefined()
      })

      it("should reject invalid id formats", () => {
        expect(validateField("id", "invalid@id", mockT)).toBe(
          "ID must only contain alphanumeric characters, hyphens, underscores, and dots."
        )
        expect(validateField("id", "invalid#id", mockT)).toBe(
          "ID must only contain alphanumeric characters, hyphens, underscores, and dots."
        )
        expect(validateField("id", "invalid id", mockT)).toBe(
          "ID must only contain alphanumeric characters, hyphens, underscores, and dots."
        )
      })
    })

    describe("name validation", () => {
      it("should reject names that are too short", () => {
        expect(validateField("name", "a", mockT)).toBe("Name must be 2-50 characters long.")
        expect(validateField("name", "", mockT)).toBe("Name must be 2-50 characters long.")
      })

      it("should reject names that are too long", () => {
        const longName = "a".repeat(51)
        expect(validateField("name", longName, mockT)).toBe("Name must be 2-50 characters long.")
      })

      it("should accept valid names", () => {
        expect(validateField("name", "ab", mockT)).toBeUndefined()
        expect(validateField("name", "ValidName", mockT)).toBeUndefined()
        expect(validateField("name", "a".repeat(50), mockT)).toBeUndefined()
      })

      it("should trim whitespace", () => {
        expect(validateField("name", "  ab  ", mockT)).toBeUndefined()
        expect(validateField("name", "  a  ", mockT)).toBe("Name must be 2-50 characters long.")
      })
    })

    describe("vcpus validation", () => {
      it("should accept valid vcpu values", () => {
        expect(validateField("vcpus", 1, mockT)).toBeUndefined()
        expect(validateField("vcpus", 8, mockT)).toBeUndefined()
        expect(validateField("vcpus", "4", mockT)).toBeUndefined()
      })

      it("should reject invalid vcpu values", () => {
        expect(validateField("vcpus", 0, mockT)).toBe("VCPUs must be an integer ≥ 1.")
        expect(validateField("vcpus", -1, mockT)).toBe("VCPUs must be an integer ≥ 1.")
        expect(validateField("vcpus", "invalid", mockT)).toBe("VCPUs must be an integer ≥ 1.")
      })
    })

    describe("ram validation", () => {
      it("should accept valid ram values", () => {
        expect(validateField("ram", 128, mockT)).toBeUndefined()
        expect(validateField("ram", 2048, mockT)).toBeUndefined()
        expect(validateField("ram", "1024", mockT)).toBeUndefined()
      })

      it("should reject invalid ram values", () => {
        expect(validateField("ram", 127, mockT)).toBe("RAM must be an integer ≥ 128 MB.")
        expect(validateField("ram", 0, mockT)).toBe("RAM must be an integer ≥ 128 MB.")
        expect(validateField("ram", "invalid", mockT)).toBe("RAM must be an integer ≥ 128 MB.")
      })
    })

    describe("disk validation", () => {
      it("should accept valid disk values", () => {
        expect(validateField("disk", 0, mockT)).toBeUndefined()
        expect(validateField("disk", 20, mockT)).toBeUndefined()
        expect(validateField("disk", "10", mockT)).toBeUndefined()
      })

      it("should reject invalid disk values", () => {
        expect(validateField("disk", -1, mockT)).toBe("Root Disk must be an integer ≥ 0.")
        expect(validateField("disk", "invalid", mockT)).toBe("Root Disk must be an integer ≥ 0.")
      })
    })

    describe("swap validation", () => {
      it("should return undefined for empty swap (optional field)", () => {
        expect(validateField("swap", "", mockT)).toBeUndefined()
        expect(validateField("swap", null, mockT)).toBeUndefined()
        expect(validateField("swap", undefined, mockT)).toBeUndefined()
      })

      it("should accept valid swap values", () => {
        expect(validateField("swap", 0, mockT)).toBeUndefined()
        expect(validateField("swap", 512, mockT)).toBeUndefined()
        expect(validateField("swap", "1024", mockT)).toBeUndefined()
      })

      it("should reject invalid swap values", () => {
        expect(validateField("swap", -1, mockT)).toBe("Swap Disk must be an integer ≥ 0.")
        expect(validateField("swap", "invalid", mockT)).toBe("Swap Disk must be an integer ≥ 0.")
      })
    })

    describe("rxtx_factor validation", () => {
      it("should accept valid rxtx_factor values", () => {
        expect(validateField("rxtx_factor", 1, mockT)).toBeUndefined()
        expect(validateField("rxtx_factor", 2, mockT)).toBeUndefined()
        expect(validateField("rxtx_factor", "3", mockT)).toBeUndefined()
      })

      it("should reject invalid rxtx_factor values", () => {
        expect(validateField("rxtx_factor", 0, mockT)).toBe("RX/TX Factor must be an integer ≥ 1.")
        expect(validateField("rxtx_factor", -1, mockT)).toBe("RX/TX Factor must be an integer ≥ 1.")
        expect(validateField("rxtx_factor", "invalid", mockT)).toBe("RX/TX Factor must be an integer ≥ 1.")
      })
    })

    describe("description validation", () => {
      it("should return undefined for empty description (optional field)", () => {
        expect(validateField("description", "", mockT)).toBeUndefined()
        expect(validateField("description", null, mockT)).toBeUndefined()
        expect(validateField("description", undefined, mockT)).toBeUndefined()
      })

      it("should accept valid descriptions", () => {
        expect(validateField("description", "A test flavor", mockT)).toBeUndefined()
        expect(validateField("description", "x".repeat(100), mockT)).toBeUndefined()
      })

      it("should reject descriptions that are too long", () => {
        const longDescription = "x".repeat(65535)
        expect(validateField("description", longDescription, mockT)).toBe(
          "Description must be less than 65535 characters."
        )
      })
    })

    describe("OS-FLV-EXT-DATA:ephemeral validation", () => {
      it("should accept valid ephemeral values", () => {
        expect(validateField("OS-FLV-EXT-DATA:ephemeral", 0, mockT)).toBeUndefined()
        expect(validateField("OS-FLV-EXT-DATA:ephemeral", 10, mockT)).toBeUndefined()
        expect(validateField("OS-FLV-EXT-DATA:ephemeral", "20", mockT)).toBeUndefined()
      })

      it("should reject invalid ephemeral values", () => {
        expect(validateField("OS-FLV-EXT-DATA:ephemeral", -1, mockT)).toBe("Ephemeral Disk must be an integer ≥ 0.")
        expect(validateField("OS-FLV-EXT-DATA:ephemeral", "invalid", mockT)).toBe(
          "Ephemeral Disk must be an integer ≥ 0."
        )
      })
    })

    describe("unknown field", () => {
      it("should return undefined for unknown fields", () => {
        expect(validateField("unknownField" as FlavorFormField, "value", mockT)).toBeUndefined()
      })
    })
  })

  describe("cleanFlavorData", () => {
    it("should include all required fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      })
    })

    it("should include valid optional string fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "custom-id",
        description: "Test description",
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "custom-id",
        description: "Test description",
      })
    })

    it("should include valid optional numeric fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: 512,
        rxtx_factor: 2,
        "OS-FLV-EXT-DATA:ephemeral": 10,
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: 512,
        rxtx_factor: 2,
        "OS-FLV-EXT-DATA:ephemeral": 10,
      })
    })

    it("should exclude empty string values", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "",
        description: "",
        swap: "",
        rxtx_factor: "",
        "OS-FLV-EXT-DATA:ephemeral": "",
      }
      // @ts-expect-error to ensure correct handling of problematic userInput, which could surive UI and validation
      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      })
    })

    it("should exclude null and undefined values", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: null,
        description: undefined,
        swap: null,
        rxtx_factor: undefined,
        "OS-FLV-EXT-DATA:ephemeral": null,
      }
      // @ts-expect-error to ensure correct handling of problematic userInput, which could surive UI and validation
      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      })
    })

    // This maybe looks a bit dangerous - but there is the other validator before which throws errors for "invalid" and so just "" land normally here.
    it("should exclude NaN values for numeric fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: "invalid",
        rxtx_factor: "not-a-number",
        "OS-FLV-EXT-DATA:ephemeral": "abc",
      }
      // @ts-expect-error to ensure correct handling of problematic userInput, which could surive UI and validation
      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      })
    })

    it("should trim whitespace from string fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "  custom-id  ",
        description: "  Test description  ",
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "custom-id",
        description: "Test description",
      })
    })

    it("should exclude whitespace-only string fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        id: "   ",
        description: "\t\n  ",
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
      })
    })

    it("should handle numeric strings correctly", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: "512",
        rxtx_factor: "2",
        "OS-FLV-EXT-DATA:ephemeral": "10",
      }
      // @ts-expect-error to ensure correct handling of problematic userInput, which could surive UI and validation
      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: 512,
        rxtx_factor: 2,
        "OS-FLV-EXT-DATA:ephemeral": 10,
      })
    })

    it("should handle zero values correctly for numeric fields", () => {
      const input = {
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: 0,
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      }

      const result = cleanFlavorData(input)

      expect(result).toEqual({
        name: "test-flavor",
        vcpus: 2,
        ram: 1024,
        disk: 20,
        swap: 0,
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
      })
    })
  })
})
