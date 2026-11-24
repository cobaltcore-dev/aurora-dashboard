import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ComponentType } from "react"
import { Route } from "./$instanceId"

const h = vi.hoisted(() => ({
  canGoBack: true,
  back: vi.fn(),
  navigate: vi.fn(),
  status: "success",
  error: null as Error | null,
  refetch: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ projectId: "project-1" }) }),
  redirect: (options: unknown) => options,
  useParams: () => ({ projectId: "project-1", instanceId: "missing-instance" }),
  useNavigate: () => h.navigate,
  useRouter: () => ({ history: { back: h.back } }),
  useCanGoBack: () => h.canGoBack,
}))
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getServersByProjectId: {
        useQuery: () => ({ data: [], status: h.status, error: h.error, refetch: h.refetch }),
      },
    },
  },
}))
vi.mock("@/client/hooks/useSetBreadcrumb", () => ({ useSetBreadcrumb: vi.fn() }))
vi.mock("./-components/InstanceDetailsView", () => ({ InstanceDetailsView: () => null }))
vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({ ContentHeader: () => null }))

const Detail = Route.options.component as ComponentType
const ErrorPage = Route.options.errorComponent as ComponentType

beforeAll(() => {
  i18n.load("en", {})
  i18n.activate("en")
})
beforeEach(() => {
  vi.clearAllMocks()
  h.canGoBack = true
  h.status = "success"
  h.error = null
})

describe("instance error navigation", () => {
  it.each(["not-found", "request-error", "route-error"])(
    "returns to the previous page from %s instead of jumping to Instances",
    (state) => {
      if (state === "request-error") {
        h.status = "error"
        h.error = new Error("Request failed")
      }
      const Page = state === "route-error" ? ErrorPage : Detail
      render(
        <I18nProvider i18n={i18n}>
          <Page />
        </I18nProvider>
      )
      fireEvent.click(screen.getByRole("button", { name: "Back" }))
      expect(h.back).toHaveBeenCalledTimes(1)
      expect(h.navigate).not.toHaveBeenCalled()
    }
  )

  it.each(["not-found", "request-error", "route-error"])("falls back to Instances on direct entry (%s)", (state) => {
    h.canGoBack = false
    if (state === "request-error") {
      h.status = "error"
      h.error = new Error("Request failed")
    }
    const Page = state === "route-error" ? ErrorPage : Detail
    render(
      <I18nProvider i18n={i18n}>
        <Page />
      </I18nProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(h.back).not.toHaveBeenCalled()
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/compute/instances",
      params: { projectId: "project-1" },
    })
  })
})
