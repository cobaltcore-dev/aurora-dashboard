import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { AuthContext } from "../store/AuthProvider"

// Mock modules before importing useScope
vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(),
}))

vi.mock("../store/AuthProvider", () => ({
  useAuth: vi.fn(),
}))

import { useScope } from "./useScope"
import { useParams } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"

const mockUseParams = vi.mocked(useParams)
const mockUseAuth = vi.mocked(useAuth)

// Helper to create a mock auth context
const createMockAuth = (user: AuthContext["user"]): AuthContext => ({
  isAuthenticated: !!user,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  user,
})

describe("useScope", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("when user is authenticated with domain and projectId is in URL", () => {
    it("should return both userDomainId and projectId", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          domain: { id: "domain-123", name: "test-domain" },
        } as AuthContext["user"])
      )
      mockUseParams.mockReturnValue({ projectId: "project-456" })

      const { result } = renderHook(() => useScope())

      expect(result.current).toEqual({
        userDomainId: "domain-123",
        projectId: "project-456",
      })
    })
  })

  describe("when user is authenticated but projectId is not in URL", () => {
    it("should return userDomainId and undefined projectId", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          domain: { id: "domain-123", name: "test-domain" },
        } as AuthContext["user"])
      )
      mockUseParams.mockReturnValue({})

      const { result } = renderHook(() => useScope())

      expect(result.current).toEqual({
        userDomainId: "domain-123",
        projectId: undefined,
      })
    })
  })

  describe("when user has no domain", () => {
    it("should return undefined userDomainId", () => {
      mockUseAuth.mockReturnValue(createMockAuth({} as AuthContext["user"]))
      mockUseParams.mockReturnValue({ projectId: "project-456" })

      const { result } = renderHook(() => useScope())

      expect(result.current).toEqual({
        userDomainId: undefined,
        projectId: "project-456",
      })
    })
  })

  describe("when user is not authenticated", () => {
    it("should return undefined userDomainId when user is null", () => {
      mockUseAuth.mockReturnValue(createMockAuth(null))
      mockUseParams.mockReturnValue({ projectId: "project-456" })

      const { result } = renderHook(() => useScope())

      expect(result.current).toEqual({
        userDomainId: undefined,
        projectId: "project-456",
      })
    })

    it("should return undefined userDomainId when user is undefined", () => {
      mockUseAuth.mockReturnValue(createMockAuth(undefined))
      mockUseParams.mockReturnValue({})

      const { result } = renderHook(() => useScope())

      expect(result.current).toEqual({
        userDomainId: undefined,
        projectId: undefined,
      })
    })
  })

  describe("useParams call", () => {
    it("should call useParams with strict: false", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          domain: { id: "domain-123", name: "test-domain" },
        } as AuthContext["user"])
      )
      mockUseParams.mockReturnValue({ projectId: "project-456" })

      renderHook(() => useScope())

      expect(mockUseParams).toHaveBeenCalledWith({ strict: false })
    })
  })
})
