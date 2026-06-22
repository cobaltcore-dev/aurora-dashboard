import { describe, it, expect, vi, beforeEach } from "vitest"
import { SessionCookie, DEFAULT_COOKIE_NAME } from "./sessionCookie"
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"

describe("SessionCookie", () => {
  const TEST_HOSTNAME = "aurora.region-1.example.com"
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
    it("should use default cookie name when none is provided", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("my-auth-token")
      expect(mockRes.setCookie).toHaveBeenCalledWith(DEFAULT_COOKIE_NAME, "my-auth-token", expect.any(Object))
    })
    it("should use provided cookie name", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes, cookieName: "some_cookie" })
      cookie.set("my-auth-token")
      expect(mockRes.setCookie).toHaveBeenCalledWith("some_cookie", "my-auth-token", expect.any(Object))
    })
  })

  describe("Cookie Operations", () => {
    it("should set cookie with token", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("my-auth-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "my-auth-token",
        expect.objectContaining({
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        })
      )
    })

    it("should not set cookie if content is null", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set(null)

      expect(mockRes.setCookie).not.toHaveBeenCalled()
    })

    it("should not set cookie if content is undefined", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set(undefined)

      expect(mockRes.setCookie).not.toHaveBeenCalled()
    })

    it("should get cookie value", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      mockReq.cookies[DEFAULT_COOKIE_NAME] = "existing-token"
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      expect(cookie.get()).toBe("existing-token")
    })

    it("should return undefined when cookie does not exist", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      expect(cookie.get()).toBeUndefined()
    })

    it("should delete cookie", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.del()

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "",
        expect.objectContaining({
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        })
      )

      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]?.expires?.getTime()).toBe(0)
    })

    it("should support custom cookie name", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const customName = "my-custom-cookie"
      const cookie = SessionCookie({ req: mockReq, res: mockRes, cookieName: customName })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(customName, "test-token", expect.any(Object))
    })

    it("should support custom expires option", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const expiryDate = new Date("2026-12-31")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token", { expires: expiryDate })

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          expires: expiryDate,
        })
      )
    })

    it("should use root path for cross-dashboard access", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          path: "/",
        })
      )
    })
  })

  describe("Cookie Security", () => {
    it("should set httpOnly to true", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          httpOnly: true,
        })
      )
    })

    it("should set secure to true by default", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          secure: true,
        })
      )
    })

    it("should set secure to false when insecureCookies=true", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({
        req: mockReq,
        res: mockRes,
        cookieName: DEFAULT_COOKIE_NAME,
        insecureCookies: true,
      })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          secure: false,
        })
      )
    })

    it("should set sameSite to strict", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })
      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          sameSite: "strict",
        })
      )
    })
  })

  describe("Domain Extraction", () => {
    it("should set domain for Aurora dashboard hostname", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          domain: ".region-1.example.com",
        })
      )
    })

    it("should set domain for Elektra dashboard hostname", () => {
      const mockReq = createMockReq("dashboard.region-1.example.com")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          domain: ".region-1.example.com",
        })
      )
    })

    it("should set domain for production hostnames", () => {
      const mockReq = createMockReq("aurora.region-2.example.com")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          domain: ".region-2.example.com",
        })
      )
    })

    it("should set domain for hostnames with multiple subdomains", () => {
      const mockReq = createMockReq("app.subdomain.example.com")
      const cookie = SessionCookie({ req: mockReq, res: mockRes })

      cookie.set("test-token")

      expect(mockRes.setCookie).toHaveBeenCalledWith(
        DEFAULT_COOKIE_NAME,
        "test-token",
        expect.objectContaining({
          domain: ".subdomain.example.com",
        })
      )
    })

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

    it("should not set domain when crossDomainCookie=false", () => {
      const mockReq = createMockReq(TEST_HOSTNAME)
      const cookie = SessionCookie({
        req: mockReq,
        res: mockRes,
        cookieName: DEFAULT_COOKIE_NAME,
        crossDomainCookie: false,
      })

      cookie.set("test-token")

      const call = vi.mocked(mockRes.setCookie).mock.calls[0]
      expect(call[2]).not.toHaveProperty("domain")
    })
  })
})
