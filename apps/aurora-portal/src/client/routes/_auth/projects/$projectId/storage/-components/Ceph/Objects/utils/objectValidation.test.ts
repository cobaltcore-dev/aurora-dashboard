import { describe, it, expect } from "vitest"
import { validateFolderName, validateObjectName, validateMetadataKey } from "./objectValidation"

describe("objectValidation", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // validateFolderName
  // ─────────────────────────────────────────────────────────────────────────

  describe("validateFolderName", () => {
    const existingFolders = ["existing-folder/", "another-folder/"]
    const validFolderNames = ["my-folder", "folder_123", "test", "f"]

    describe("valid folder names", () => {
      it.each(validFolderNames)('should accept valid folder name: "%s"', (name) => {
        const result = validateFolderName(name, existingFolders, "")
        expect(result).toBeNull()
      })

      it("should accept folder name with numbers", () => {
        expect(validateFolderName("folder-123", existingFolders, "")).toBeNull()
      })

      it("should accept folder name with underscores", () => {
        expect(validateFolderName("my_folder", existingFolders, "")).toBeNull()
      })

      it("should accept folder name with hyphens", () => {
        expect(validateFolderName("my-folder", existingFolders, "")).toBeNull()
      })
    })

    describe("required validation", () => {
      it("should reject empty string", () => {
        const result = validateFolderName("", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("required")
        expect(result?.message).toBeDefined()
      })

      it("should reject whitespace-only string", () => {
        const result = validateFolderName("   ", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("required")
      })
    })

    describe("slash validation", () => {
      it("should reject folder name containing slashes", () => {
        const result = validateFolderName("folder/subfolder", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("slashes")
      })

      it("should reject folder name with multiple slashes", () => {
        const result = validateFolderName("a/b/c", existingFolders, "")
        expect(result?.type).toBe("slashes")
      })
    })

    describe("whitespace validation", () => {
      it("should reject folder name with leading whitespace", () => {
        const result = validateFolderName(" folder", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("whitespace")
      })

      it("should reject folder name with trailing whitespace", () => {
        const result = validateFolderName("folder ", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("whitespace")
      })

      it("should reject folder name with both leading and trailing whitespace", () => {
        const result = validateFolderName("  folder  ", existingFolders, "")
        expect(result?.type).toBe("whitespace")
      })
    })

    describe("length validation", () => {
      it("should accept folder name at max length (255 chars)", () => {
        const maxLengthName = "a".repeat(255)
        const result = validateFolderName(maxLengthName, existingFolders, "")
        expect(result).toBeNull()
      })

      it("should reject folder name exceeding 255 chars", () => {
        const tooLongName = "a".repeat(256)
        const result = validateFolderName(tooLongName, existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("too-long")
      })
    })

    describe("duplicate validation", () => {
      it("should reject duplicate folder name at root level", () => {
        const result = validateFolderName("existing-folder", existingFolders, "")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("duplicate")
      })

      it("should reject duplicate folder name with prefix", () => {
        const prefix = "parent/"
        const existing = ["parent/child/"]
        const result = validateFolderName("child", existing, prefix)
        expect(result?.type).toBe("duplicate")
      })

      it("should allow same name in different prefix", () => {
        const existing = ["parent1/folder/"]
        const result = validateFolderName("folder", existing, "parent2/")
        expect(result).toBeNull()
      })

      it("should be case-sensitive for duplicates", () => {
        const existing = ["Folder/"]
        const result = validateFolderName("folder", existing, "")
        expect(result).toBeNull() // Different case = not duplicate
      })
    })

    describe("prefix handling", () => {
      it("should validate with empty prefix", () => {
        const result = validateFolderName("new-folder", [], "")
        expect(result).toBeNull()
      })

      it("should validate with nested prefix", () => {
        const prefix = "level1/level2/"
        const result = validateFolderName("level3", [], prefix)
        expect(result).toBeNull()
      })

      it("should construct correct path with prefix", () => {
        const prefix = "documents/"
        const existing = ["documents/reports/"]
        const result = validateFolderName("reports", existing, prefix)
        expect(result?.type).toBe("duplicate")
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // validateObjectName
  // ─────────────────────────────────────────────────────────────────────────

  describe("validateObjectName", () => {
    const validObjectNames = ["file.txt", "image-2024.jpg", "data_v2.json"]

    describe("valid object names", () => {
      it.each(validObjectNames)('should accept valid object name: "%s"', (name) => {
        const result = validateObjectName(name)
        expect(result).toBeNull()
      })

      it("should accept name with extension", () => {
        expect(validateObjectName("document.pdf")).toBeNull()
      })

      it("should accept name with multiple dots", () => {
        expect(validateObjectName("file.backup.2024.tar.gz")).toBeNull()
      })

      it("should accept name with special chars (except slash)", () => {
        expect(validateObjectName("file-name_v2.txt")).toBeNull()
      })
    })

    describe("required validation", () => {
      it("should reject empty string", () => {
        const result = validateObjectName("")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("required")
      })

      it("should reject whitespace-only string", () => {
        const result = validateObjectName("   ")
        expect(result?.type).toBe("required")
      })
    })

    describe("slash validation", () => {
      it("should reject object name with slash", () => {
        const result = validateObjectName("folder/file.txt")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("slashes")
      })

      it("should reject object name with leading slash", () => {
        const result = validateObjectName("/file.txt")
        expect(result?.type).toBe("slashes")
      })
    })

    describe("whitespace validation", () => {
      it("should reject object name with leading whitespace", () => {
        const result = validateObjectName(" file.txt")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("whitespace")
      })

      it("should reject object name with trailing whitespace", () => {
        const result = validateObjectName("file.txt ")
        expect(result?.type).toBe("whitespace")
      })
    })

    describe("difference from validateFolderName", () => {
      it("does not check for duplicates", () => {
        // validateObjectName doesn't take existingNames parameter
        const result = validateObjectName("any-name")
        expect(result).toBeNull()
      })

      it("does not check length limit", () => {
        // No 255 char limit like folders
        const longName = "a".repeat(300)
        const result = validateObjectName(longName)
        expect(result).toBeNull() // Only checks required, slashes, whitespace
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // validateMetadataKey
  // ─────────────────────────────────────────────────────────────────────────

  describe("validateMetadataKey", () => {
    const validMetadataKeys = ["key-1", "my_key", "CustomKey", "abc123"]

    describe("valid metadata keys", () => {
      it.each(validMetadataKeys)('should accept valid key: "%s"', (key) => {
        const result = validateMetadataKey(key)
        expect(result).toBeNull()
      })

      it("should accept alphanumeric only", () => {
        expect(validateMetadataKey("key123")).toBeNull()
      })

      it("should accept key with hyphens", () => {
        expect(validateMetadataKey("my-key")).toBeNull()
      })

      it("should accept key with underscores", () => {
        expect(validateMetadataKey("my_key")).toBeNull()
      })

      it("should accept mixed case", () => {
        expect(validateMetadataKey("MyCustomKey")).toBeNull()
      })

      it("should accept key with all valid chars", () => {
        expect(validateMetadataKey("Valid-Key_123")).toBeNull()
      })
    })

    describe("required validation", () => {
      it("should reject empty string", () => {
        const result = validateMetadataKey("")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("required")
      })

      it("should reject whitespace-only string", () => {
        const result = validateMetadataKey("   ")
        expect(result?.type).toBe("required")
      })
    })

    describe("invalid characters", () => {
      it("should reject key with spaces", () => {
        const result = validateMetadataKey("my key")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("invalid-chars")
      })

      it("should reject key with special characters", () => {
        const invalidChars = ["@", "#", "$", "%", "^", "&", "*", "(", ")", "=", "+", "[", "]"]
        invalidChars.forEach((char) => {
          const result = validateMetadataKey(`key${char}`)
          expect(result?.type).toBe("invalid-chars")
        })
      })

      it("should reject key with dots", () => {
        const result = validateMetadataKey("my.key")
        expect(result?.type).toBe("invalid-chars")
      })

      it("should reject key with slashes", () => {
        const result = validateMetadataKey("my/key")
        expect(result?.type).toBe("invalid-chars")
      })
    })

    describe("alphanumeric requirement", () => {
      it("should reject key with only hyphens", () => {
        const result = validateMetadataKey("---")
        expect(result).not.toBeNull()
        expect(result?.type).toBe("invalid-chars")
      })

      it("should reject key with only underscores", () => {
        const result = validateMetadataKey("___")
        expect(result?.type).toBe("invalid-chars")
      })

      it("should accept key starting with number", () => {
        expect(validateMetadataKey("1key")).toBeNull()
      })

      it("should accept key ending with hyphen", () => {
        expect(validateMetadataKey("key-")).toBeNull()
      })

      it("should accept key ending with underscore", () => {
        expect(validateMetadataKey("key_")).toBeNull()
      })
    })

    describe("S3 compatibility", () => {
      it("should accept typical S3 metadata key format", () => {
        const s3Keys = ["content-type", "cache-control", "x-amz-meta-custom", "Content-Disposition"]
        s3Keys.forEach((key) => {
          expect(validateMetadataKey(key)).toBeNull()
        })
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // ValidationError structure
  // ─────────────────────────────────────────────────────────────────────────

  describe("ValidationError structure", () => {
    it("should return null for valid input", () => {
      const result = validateFolderName("valid-name", [], "")
      expect(result).toBeNull()
    })

    it("should return object with type and message for invalid input", () => {
      const result = validateFolderName("", [], "")
      expect(result).toHaveProperty("type")
      expect(result).toHaveProperty("message")
    })

    it("should have correct type values", () => {
      const types = ["required", "slashes", "whitespace", "too-long", "duplicate", "invalid-chars"]
      // At least one test should produce each type
      expect(types).toContain(validateFolderName("", [], "")?.type)
      expect(types).toContain(validateFolderName("a/b", [], "")?.type)
      expect(types).toContain(validateFolderName(" a", [], "")?.type)
      expect(types).toContain(validateFolderName("a".repeat(256), [], "")?.type)
      expect(types).toContain(validateFolderName("test", ["test/"], "")?.type)
      expect(types).toContain(validateMetadataKey("@@@")?.type)
    })

    it("should have MessageDescriptor for i18n support", () => {
      const result = validateFolderName("", [], "")
      expect(result?.message).toBeDefined()
      // MessageDescriptor should be an object (from @lingui/core)
      expect(typeof result?.message).toBe("object")
    })
  })
})
