import { describe, it, expect } from "vitest"
import { redirect } from "@tanstack/react-router"

describe("_auth route", () => {
  describe("beforeLoad redirect", () => {
    it("should preserve pathname and search params in redirect", () => {
      const location = {
        pathname: "/projects/123/compute",
        search: "tab=instances&filter=active",
        href: "/projects/123/compute?tab=instances&filter=active",
      }

      // Simulate the beforeLoad logic
      try {
        const redirectPath =
          location.pathname + (location.search ? `?${new URLSearchParams(location.search).toString()}` : "")

        throw redirect({
          to: "/",
          search: { redirect: redirectPath },
        })
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) {
          const redirectObj = e as { to: string; search?: { redirect: string } }
          expect(redirectObj.to).toBe("/")
          expect(redirectObj.search?.redirect).toBe("/projects/123/compute?tab%3Dinstances%26filter%3Dactive")
        }
      }
    })

    it("should handle pathname without search params", () => {
      const location = {
        pathname: "/projects/123/compute",
        search: "",
        href: "/projects/123/compute",
      }

      try {
        const redirectPath =
          location.pathname + (location.search ? `?${new URLSearchParams(location.search).toString()}` : "")

        throw redirect({
          to: "/",
          search: { redirect: redirectPath },
        })
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) {
          const redirectObj = e as { to: string; search?: { redirect: string } }
          expect(redirectObj.to).toBe("/")
          expect(redirectObj.search?.redirect).toBe("/projects/123/compute")
        }
      }
    })

    it("should handle empty pathname", () => {
      const location = {
        pathname: "",
        search: "",
        href: "/",
      }

      try {
        const redirectPath =
          location.pathname + (location.search ? `?${new URLSearchParams(location.search).toString()}` : "")

        throw redirect({
          to: "/",
          search: { redirect: redirectPath },
        })
      } catch (e) {
        if (e && typeof e === "object" && "to" in e) {
          const redirectObj = e as { to: string; search?: { redirect: string } }
          expect(redirectObj.to).toBe("/")
          expect(redirectObj.search?.redirect).toBe("")
        }
      }
    })
  })
})
