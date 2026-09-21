import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { useParams } from "@tanstack/react-router"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "@/locales/en/messages"
import { Route } from "./$storageType"

i18n.load("en", enMessages)
i18n.activate("en")

const navigateMock = vi.fn()

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: vi.fn(),
  }
})

vi.mock("@/client/hooks/useSetBreadcrumb", () => ({ useSetBreadcrumb: vi.fn() }))

/**
 * The layout's own notFound boundary. It answers for any address under
 * `/storage/$provider/$storageType/` that matches no route — a mistyped tail
 * (`.../my-bucket/object`) or a truncated link (`.../my-bucket`) — which until this
 * boundary existed fell through to the router's storage-unaware global fallback.
 */
describe("StorageTypeNotFound", () => {
  const NotFoundComponent = Route.options.notFoundComponent as () => React.ReactElement

  const renderBoundary = (provider = "ceph", storageType = "buckets") => {
    vi.mocked(useParams).mockReturnValue({ projectId: "p1", provider, storageType })
    return render(
      <I18nProvider i18n={i18n}>
        <NotFoundComponent />
      </I18nProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a 404 whose only exit is the bucket list", () => {
    renderBoundary()

    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
    expect(screen.getByText("This address is not valid for this object storage service.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Back to Buckets" }))
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId: "p1", provider: "ceph", storageType: "buckets" },
    })
  })

  it("uses the containers list for Swift", () => {
    renderBoundary("swift", "containers")

    fireEvent.click(screen.getByRole("button", { name: "Back to Containers" }))
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId: "p1", provider: "swift", storageType: "containers" },
    })
  })

  // The list link is built from route params, so without them it must not be offered at
  // all — the shared component then supplies its own action rather than none.
  it("falls back to the shared component's action when the params are not readable", () => {
    vi.mocked(useParams).mockReturnValue({})

    render(
      <I18nProvider i18n={i18n}>
        <NotFoundComponent />
      </I18nProvider>
    )

    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Back to/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go to Home" })).toBeInTheDocument()
  })

  // The layout route has no guard, so an unknown provider segment reaches this boundary too.
  // Echoing it back into a list link would answer the 404 with the list route's own.
  it("offers no list link for a provider the URL made up", () => {
    renderBoundary("garbage", "garbage")

    expect(screen.queryByRole("button", { name: /Back to/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go to Project Home" })).toBeInTheDocument()
  })

  // `/storage/ceph/containers/my-bucket/oops`: the provider is real, the noun is not. The
  // list link has to use the provider's own noun — `containers` is what the list route 404s on.
  it("corrects a storage-type noun that does not belong to the provider", () => {
    renderBoundary("ceph", "containers")

    fireEvent.click(screen.getByRole("button", { name: "Back to Buckets" }))
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId: "p1", provider: "ceph", storageType: "buckets" },
    })
  })
})
