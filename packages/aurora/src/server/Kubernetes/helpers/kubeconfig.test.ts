import { describe, it, expect, vi } from "vitest"
import { decodeKubeconfig, buildGardenKubeconfig } from "./kubeconfig"

describe("kubeconfig", () => {
  describe("decodeKubeconfig", () => {
    it("decodes valid base64", () => {
      const b64 = Buffer.from("test content", "utf8").toString("base64")
      expect(decodeKubeconfig(b64)).toBe("test content")
    })

    it("throws on invalid base64 characters", () => {
      expect(() => decodeKubeconfig("invalid!@#$")).toThrow("Kubeconfig generation failed")
    })

    it("throws on invalid base64 length", () => {
      expect(() => decodeKubeconfig("abc")).toThrow("Kubeconfig generation failed")
    })

    it("accepts base64 with padding", () => {
      const b64 = "dGVzdA==" // "test"
      expect(decodeKubeconfig(b64)).toBe("test")
    })
  })

  describe("buildGardenKubeconfig", () => {
    it("builds a kubeconfig with all fields", () => {
      const config = buildGardenKubeconfig({
        server: "https://persephone-qa.example",
        namespace: "garden-qa-de-1-p-1",
        token: "qa-de-1:tok-123",
      })

      expect(config).toContain('server: "https://persephone-qa.example"')
      expect(config).toContain('namespace: "garden-qa-de-1-p-1"')
      expect(config).toContain('token: "qa-de-1:tok-123"')
      expect(config).toContain('current-context: "garden"')
      expect(config).toContain('name: "garden"')
      expect(config).toContain('name: "garden-user"')
    })

    it("contains the token exactly once", () => {
      const config = buildGardenKubeconfig({
        server: "https://persephone-qa.example",
        namespace: "garden-qa-de-1-p-1",
        token: "qa-de-1:tok-123",
      })

      const matches = config.match(/tok-123/g)
      expect(matches).toHaveLength(1)
    })

    it("does not leak token in console logs during test", () => {
      const logSpy = vi.spyOn(console, "log")
      const warnSpy = vi.spyOn(console, "warn")
      const errorSpy = vi.spyOn(console, "error")
      const debugSpy = vi.spyOn(console, "debug")

      buildGardenKubeconfig({
        server: "https://persephone-qa.example",
        namespace: "garden-qa-de-1-p-1",
        token: "qa-de-1:tok-123",
      })

      const allCalls = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls, ...debugSpy.mock.calls]

      for (const call of allCalls) {
        const serialized = JSON.stringify(call)
        expect(serialized).not.toContain("tok-123")
      }

      logSpy.mockRestore()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
      debugSpy.mockRestore()
    })
  })
})
