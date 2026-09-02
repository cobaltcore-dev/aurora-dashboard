import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { DynamicBreadcrumbProvider } from "@/client/context/DynamicBreadcrumbContext"
import { BreadcrumbExtensionProvider } from "@/client/context/BreadcrumbExtensionContext"
import { useBreadcrumbs } from "./useBreadcrumbs"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useMatches: () => [
    {
      routeId: "/_auth",
      staticData: { crumb: { icon: "home", to: "/projects" } },
      pathname: "/",
    },
    {
      routeId: "/_auth/projects/$projectId",
      staticData: { crumb: { text: "my-domain/my-project" } },
      pathname: "/projects/test-project",
    },
    {
      routeId: "/_auth/projects/$projectId/compute/images",
      staticData: { crumb: { text: "Images" } },
      pathname: "/projects/test-project/compute/images",
    },
  ],
  useParams: () => ({ projectId: "test-project" }),
  useRouteContext: () => ({ additionalProjectServices: [] }),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <DynamicBreadcrumbProvider>
      <BreadcrumbExtensionProvider>{children}</BreadcrumbExtensionProvider>
    </DynamicBreadcrumbProvider>
  </I18nProvider>
)

describe("useBreadcrumbs", () => {
  it("returns breadcrumb items for all matched routes that declare a crumb", () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper })

    const labels = result.current.map((item) => item.label)
    expect(labels).toEqual([undefined, "my-domain/my-project", "Images"])

    expect(result.current[0].icon).toBe("home")
    expect(result.current[2].active).toBe(true)
    expect(result.current[1].active).toBe(false)
  })
})
