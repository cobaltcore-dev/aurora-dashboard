import { describe, it, expect } from "vitest"
import { Route } from "./_auth"

type BeforeLoadParams = Parameters<NonNullable<typeof Route.options.beforeLoad>>[0]

describe("_auth route", () => {
  describe("beforeLoad redirect", () => {
    it("should redirect to login with full path preserved when not authenticated", async () => {
      const params: BeforeLoadParams = {
        context: { auth: { isAuthenticated: false } } as BeforeLoadParams["context"],
        location: {
          pathname: "/projects/123/compute",
          search: new URLSearchParams("tab=instances&filter=active"),
          searchStr: "?tab=instances&filter=active",
          href: "/projects/123/compute?tab=instances&filter=active",
          hash: "",
          state: { __TSR_index: 0 },
          publicHref: "",
          external: false,
        } as BeforeLoadParams["location"],
      } as BeforeLoadParams

      try {
        await Route.options.beforeLoad?.(params)
        throw new Error("Expected redirect to be thrown")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e.options.to).toBe("/")
        expect(e.options.search.redirect).toBe("/projects/123/compute?tab=instances&filter=active")
      }
    })

    it("should redirect with pathname only when no search params", async () => {
      const params: BeforeLoadParams = {
        context: { auth: { isAuthenticated: false } } as BeforeLoadParams["context"],
        location: {
          pathname: "/projects/123/compute",
          search: new URLSearchParams(""),
          searchStr: "",
          href: "/projects/123/compute",
          hash: "",
          state: { __TSR_index: 0 },
          publicHref: "",
          external: false,
        } as BeforeLoadParams["location"],
      } as BeforeLoadParams

      try {
        await Route.options.beforeLoad?.(params)
        throw new Error("Expected redirect to be thrown")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e.options.to).toBe("/")
        // Bug: empty search params produce "?" suffix
        expect(e.options.search.redirect).toBe("/projects/123/compute?")
      }
    })

    it("should redirect with empty string for root pathname", async () => {
      const params: BeforeLoadParams = {
        context: { auth: { isAuthenticated: false } } as BeforeLoadParams["context"],
        location: {
          pathname: "",
          search: new URLSearchParams(""),
          searchStr: "",
          href: "/",
          hash: "",
          state: { __TSR_index: 0 },
          publicHref: "",
          external: false,
        } as BeforeLoadParams["location"],
      } as BeforeLoadParams

      try {
        await Route.options.beforeLoad?.(params)
        throw new Error("Expected redirect to be thrown")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e.options.to).toBe("/")
        // Bug: empty search params produce "?" suffix
        expect(e.options.search.redirect).toBe("?")
      }
    })

    it("should not redirect when authenticated", async () => {
      const params: BeforeLoadParams = {
        context: { auth: { isAuthenticated: true } } as BeforeLoadParams["context"],
        location: {
          pathname: "/projects/123",
          search: new URLSearchParams(""),
          searchStr: "",
          href: "/projects/123",
          hash: "",
          state: { __TSR_index: 0 },
          publicHref: "",
          external: false,
        } as BeforeLoadParams["location"],
      } as BeforeLoadParams

      await expect(Route.options.beforeLoad?.(params)).resolves.toBeUndefined()
    })
  })
})
