import { describe, it, expect } from "vitest"
import { isSecretHeader, redactAccountSecrets, redactContainerSecrets } from "./secretHelpers"

describe("secretHelpers", () => {
  describe("isSecretHeader", () => {
    it("should identify secret headers", () => {
      expect(isSecretHeader("x-auth-token")).toBe(true)
      expect(isSecretHeader("x-container-sync-key")).toBe(true)
      expect(isSecretHeader("x-container-meta-temp-url-key")).toBe(true)
    })

    it("should not identify non-secret headers", () => {
      expect(isSecretHeader("content-type")).toBe(false)
      expect(isSecretHeader("x-container-object-count")).toBe(false)
    })
  })

  describe("redactAccountSecrets", () => {
    it("should return false when no secrets present", () => {
      const headers = new Headers({
        "x-account-object-count": "42",
      })

      const result = redactAccountSecrets(headers)

      expect(result.hasTempUrlKey).toBe(false)
    })

    it("should detect account TempURL keys", () => {
      const headers = new Headers({
        "x-account-meta-temp-url-key": "secret-key-123",
      })

      const result = redactAccountSecrets(headers)

      expect(result.hasTempUrlKey).toBe(true)
    })
  })

  describe("redactContainerSecrets", () => {
    it("should return false when no secrets present", () => {
      const headers = new Headers({
        "x-container-object-count": "10",
      })

      const result = redactContainerSecrets(headers)

      expect(result.hasTempUrlKey).toBe(false)
      expect(result.hasSyncKey).toBe(false)
    })

    it("should detect container TempURL keys", () => {
      const headers = new Headers({
        "x-container-meta-temp-url-key": "secret-key-123",
      })

      const result = redactContainerSecrets(headers)

      expect(result.hasTempUrlKey).toBe(true)
      expect(result.hasSyncKey).toBe(false)
    })

    it("should detect sync key", () => {
      const headers = new Headers({
        "x-container-sync-key": "sync-secret-xyz",
      })

      const result = redactContainerSecrets(headers)

      expect(result.hasTempUrlKey).toBe(false)
      expect(result.hasSyncKey).toBe(true)
    })

    it("should detect multiple secrets", () => {
      const headers = new Headers({
        "x-container-meta-temp-url-key": "secret-1",
        "x-container-sync-key": "sync-secret",
      })

      const result = redactContainerSecrets(headers)

      expect(result.hasTempUrlKey).toBe(true)
      expect(result.hasSyncKey).toBe(true)
    })
  })
})
