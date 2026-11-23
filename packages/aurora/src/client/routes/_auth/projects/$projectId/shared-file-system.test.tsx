import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { ComponentType } from "react"
import { Route } from "./shared-file-system"

const h = vi.hoisted(() => ({
  matches: [{ routeId: "/_auth/projects/$projectId/shared-file-system/" }],
  catalog: [{ type: "sharev2", name: "manilav2" }] as { type: string; name: string }[],
  canListShares: true,
  canReadShares: true,
  canListSnapshots: true,
  canReadSnapshots: true,
  canListShareNetworks: true,
  canReadShareNetworks: true,
  canListSecurityServices: true,
  canReadSecurityServices: true,
  canListAny: true,
  navigate: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
  pending: false,
  error: null as unknown,
}))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ projectId: "project-1" }) }),
  redirect: (options: unknown) => options,
  isRedirect: (err: unknown) => typeof err === "object" && err !== null && "to" in err,
  useMatches: () => h.matches,
  useNavigate: () => h.navigate,
  useRouter: () => ({ invalidate: h.invalidate }),
  Outlet: () => <div data-testid="scope-content" />,
}))
vi.mock("@/client/hooks/useSharedFileSystemPermissions", () => ({
  useSharedFileSystemPermissions: () => ({
    isPending: h.pending,
    error: h.error,
    refetch: h.refetch,
    canListShares: h.canListShares,
    canReadShares: h.canReadShares,
    canListSnapshots: h.canListSnapshots,
    canReadSnapshots: h.canReadSnapshots,
    canListShareNetworks: h.canListShareNetworks,
    canReadShareNetworks: h.canReadShareNetworks,
    canListSecurityServices: h.canListSecurityServices,
    canReadSecurityServices: h.canReadSecurityServices,
    canListAny: h.canListAny,
  }),
}))
vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

const guard = Route.options.beforeLoad as unknown as (options: {
  context: {
    trpcClient: { auth: { getAvailableServices: { query: () => Promise<{ type: string; name: string }[]> } } }
    deniedServices?: string[]
    enabledServices?: string[]
  }
  params: { projectId: string }
}) => Promise<void>
const Layout = Route.options.component as ComponentType

beforeAll(() => {
  i18n.load("en", {})
  i18n.activate("en")
})
beforeEach(() => {
  vi.clearAllMocks()
  h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/" }]
  h.catalog = [{ type: "sharev2", name: "manilav2" }]
  h.canListShares = true
  h.canReadShares = true
  h.canListSnapshots = true
  h.canReadSnapshots = true
  h.canListShareNetworks = true
  h.canReadShareNetworks = true
  h.canListSecurityServices = true
  h.canReadSecurityServices = true
  h.canListAny = true
  h.pending = false
  h.error = null
})

describe("shared file system scope routing", () => {
  it("redirects to the project when Manila is absent from the catalog", async () => {
    await expect(
      guard({
        context: { trpcClient: { auth: { getAvailableServices: { query: async () => [] } } } },
        params: { projectId: "project-1" },
      })
    ).rejects.toEqual({ to: "/projects/$projectId", params: { projectId: "project-1" } })
  })
  it("redirects when type matches but name does not", async () => {
    await expect(
      guard({
        context: {
          trpcClient: { auth: { getAvailableServices: { query: async () => [{ type: "sharev2", name: "manila" }] } } },
        },
        params: { projectId: "project-1" },
      })
    ).rejects.toEqual({ to: "/projects/$projectId", params: { projectId: "project-1" } })
  })
  it("honors service configuration even when the catalog has Manila", async () => {
    const context = {
      trpcClient: { auth: { getAvailableServices: { query: async () => h.catalog } } },
      deniedServices: ["shared-file-system"],
    }
    await expect(guard({ context, params: { projectId: "project-1" } })).rejects.toEqual({
      to: "/projects/$projectId",
      params: { projectId: "project-1" },
    })
  })
  it("redirects when enabledServices excludes shared-file-system", async () => {
    const context = {
      trpcClient: { auth: { getAvailableServices: { query: async () => h.catalog } } },
      enabledServices: ["volumes", "containers"],
    }
    await expect(guard({ context, params: { projectId: "project-1" } })).rejects.toEqual({
      to: "/projects/$projectId",
      params: { projectId: "project-1" },
    })
  })
  it("redirects when getAvailableServices rejects", async () => {
    await expect(
      guard({
        context: {
          trpcClient: {
            auth: {
              getAvailableServices: {
                query: async () => {
                  throw new Error("network error")
                },
              },
            },
          },
        },
        params: { projectId: "project-1" },
      })
    ).rejects.toEqual({ to: "/projects/$projectId", params: { projectId: "project-1" } })
  })
  it("resolves when the catalog has the exact sharev2/manilav2 pair", async () => {
    await expect(
      guard({
        context: { trpcClient: { auth: { getAvailableServices: { query: async () => h.catalog } } } },
        params: { projectId: "project-1" },
      })
    ).resolves.toBeUndefined()
  })
  it("renders three peer resource tabs and navigates to Share Networks", () => {
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByRole("navigation", { name: "Shared file system resources" })).toBeInTheDocument()
    expect(screen.getByText("Shares")).toBeInTheDocument()
    expect(screen.getByText("Share Networks")).toBeInTheDocument()
    expect(screen.getByText("Security Services")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Share Networks"))
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/share-networks",
      params: { projectId: "project-1" },
    })
  })
  it("navigates to Security Services", () => {
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    fireEvent.click(screen.getByText("Security Services"))
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/shared-file-system/security-services",
      params: { projectId: "project-1" },
    })
  })
  it("suppresses the list shell on a detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/$shareId/" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByRole("navigation", { name: "Shared file system resources" })).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("hides header and tabs on share detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/$shareId/" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByText("Shared File System")).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("hides header and tabs on snapshot detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/snapshots/$snapshotId" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByText("Shared File System")).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("hides header and tabs on share network detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/share-networks/$shareNetworkId/" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByText("Shared File System")).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("hides header and tabs on security service detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/security-services/$securityServiceId" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByText("Shared File System")).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("denies the Shares outlet when user lacks list permission while keeping tabs", () => {
    h.canListShares = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByRole("navigation", { name: "Shared file system resources" })).toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("denies the Share Networks outlet when user lacks list permission", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/share-networks/" }]
    h.canListShareNetworks = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("denies the Security Services outlet when user lacks list permission", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/security-services/" }]
    h.canListSecurityServices = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("checks share detail read permission independently of list permission", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/$shareId/" }]
    h.canReadShares = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("checks snapshot detail read permission", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/shared-file-system/snapshots/$snapshotId" }]
    h.canReadSnapshots = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("denies everything without tabs when canListAny is false", () => {
    h.canListAny = false
    h.canListShares = false
    h.canListShareNetworks = false
    h.canListSecurityServices = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByRole("navigation", { name: "Shared file system resources" })).not.toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("shows loading state when pending", () => {
    h.pending = true
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Loading Shared File System...")).toBeInTheDocument()
  })
  it("shows Access Denied for FORBIDDEN error", () => {
    h.error = { data: { code: "FORBIDDEN" } }
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("shows Session Expired for UNAUTHORIZED error with retry", () => {
    h.error = { data: { code: "UNAUTHORIZED" } }
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Try again")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Try again"))
    expect(h.refetch).toHaveBeenCalled()
  })
  it("shows generic error for other error codes with retry", () => {
    h.error = { data: { code: "UNKNOWN" } }
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Failed to Load Shared File System")).toBeInTheDocument()
    expect(screen.getByText("Try again")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Try again"))
    expect(h.refetch).toHaveBeenCalled()
  })
})
