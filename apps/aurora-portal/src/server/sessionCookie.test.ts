import { describe, it, expect, vi, beforeEach } from "vitest"
import { SessionCookie, SessionCookieName } from "./sessionCookie"
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"

describe("SessionCookie", () => {
  let mockRes: CreateFastifyContextOptions["res"]

  beforeEach(() => {
    mockRes = {
      setCookie: vi.fn(),
    } as unknown as CreateFastifyContextOptions["res"]
  })

  const createMockReq = (hostname: string) =>
    ({
      cookies: {},
      hostname,
    }) as CreateFastifyContextOptions["req"]

  describe("Cookie Name", () => {
    it("should use default cookie name", () => {
      expect(SessionCookieName).toBe("aurora-session")
    })
  })

  describe("Cookie Operations", () => {
    it("should set cookie with token", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("my-auth-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "my-auth-token",
        expect.objectContaining({
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: false,
        })
      )
    })

    it("should not set cookie if content is null", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set(null)

      expect(mockRes.setCookie).not.toHaveBeenCalled()
    })

    it("should not set cookie if content is undefined", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set(undefined)

      expect(mockRes.setCookie).not.toHaveBeenCalled()
    })

    it("should get cookie value", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      mockReq.cookies[SessionCookieName] = "existing-token"
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      expect(cookie.get()).toBe("existing-token")
    })

    it("should return undefined when cookie does not exist", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      expect(cookie.get()).toBeUndefined()
    })

    it("should delete cookie", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.del()

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "",
        expect.objectContaining({
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: false,
          expires: expect.any(Date),
        })
      )

      // Verify the expires date is in the past (epoch)
      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]?.expires?.getTime()).toBe(0)
    })

    it("should support custom cookie name", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const customName = "my-custom-cookie"
      const cookie = SessionCookie({ req: mockReq, res: mockRes, cookieName: customName })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(customName, "test-token", expect.any(Object))
    })

    it("should support custom expires option", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const expiryDate = new Date("2026-12-31")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token", { expires: expiryDate })

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "test-token",
        expect.objectContaining({
          expires: expiryDate,
        })
      )
    })

    it("should use root path for cross-dashboard access", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "test-token",
        expect.objectContaining({
          path: "/",
        })
      )
    })
  })

  describe("Cookie Security", () => {
    it("should set httpOnly to true", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "test-token",
        expect.objectContaining({
          httpOnly: true,
        })
      )
    })

    it("should set secure to false in non-production", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "test-token",
        expect.objectContaining({
          secure: false,
        })
      )
    })

    it("should set sameSite to strict", () => {
      const mockReq = createMockReq("aurora.qa-de-1.cloud.sap")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        SessionCookieName,
        "test-token",
        expect.objectContaining({
          sameSite: "strict",
        })
      )
    })
  })

  describe("Domain Extraction", () => {
    it("should not set domain for localhost", () => {
      const mockReq = createMockReq("localhost")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]).not.toHaveProperty("domain")
    })

    it("should not set domain for IP addresses", () => {
      const mockReq = createMockReq("192.168.1.100")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]).not.toHaveProperty("domain")
    })

    it("should not set domain for hostnames with less than 3 parts", () => {
      const mockReq = createMockReq("example.com")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]).not.toHaveProperty("domain")
    })
  })
})

// NOTE: Cross-dashboard domain (wildcard subdomain) is ENABLED BY DEFAULT
// To test with the feature disabled, run:
//
// ENABLE_CROSS_DASHBOARD_DOMAIN=false pnpm test sessionCookie
//
// Default behavior (enabled):
// - aurora.qa-de-1.cloud.sap → domain: .qa-de-1.cloud.sap
// - dashboard.qa-de-1.cloud.sap → domain: .qa-de-1.cloud.sap
// - Both Aurora and Elektra share the same wildcard domain
//
// When disabled (ENABLE_CROSS_DASHBOARD_DOMAIN=false):
// - No domain attribute is set
// - Cookies are scoped to current subdomain only
