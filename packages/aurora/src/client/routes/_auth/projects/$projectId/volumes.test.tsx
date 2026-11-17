import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { ComponentType } from "react"
import { Route } from "./volumes"

const h = vi.hoisted(() => ({
  matches: [{ routeId: "/_auth/projects/$projectId/volumes/" }],
  canListVolumes: true,
  canListSnapshots: true,
  canReadVolumes: true,
  canReadSnapshots: true,
  navigate: vi.fn(),
  invalidate: vi.fn(),
  refetch: vi.fn(),
  terminate: vi.fn(),
  pending: false,
  error: null as unknown,
}))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ projectId: "project-1" }) }),
  redirect: (options: unknown) => options,
  useMatches: () => h.matches,
  useNavigate: () => h.navigate,
  useRouter: () => ({ invalidate: h.invalidate }),
  Outlet: () => <div data-testid="scope-content" />,
}))
vi.mock("@/client/hooks/useVolumePermissions", () => ({
  useVolumePermissions: () => ({
    isPending: h.pending,
    error: h.error,
    refetch: h.refetch,
    canListVolumes: h.canListVolumes,
    canListSnapshots: h.canListSnapshots,
    canReadVolumes: h.canReadVolumes,
    canReadSnapshots: h.canReadSnapshots,
  }),
}))
vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock("@/client/trpcClient", () => ({ trpcClient: { auth: { terminateUserSession: { mutate: h.terminate } } } }))

const guard = Route.options.beforeLoad as unknown as (options: {
  context: {
    trpcClient: {
      volume: { getAvailability: { query: (input: { project_id: string }) => Promise<{ available: boolean }> } }
    }
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
  h.matches = [{ routeId: "/_auth/projects/$projectId/volumes/" }]
  h.canListVolumes = true
  h.canListSnapshots = true
  h.canReadVolumes = true
  h.canReadSnapshots = true
  h.pending = false
  h.error = null
})

describe("volume scope routing", () => {
  it("redirects to the project when Cinder is absent", async () => {
    await expect(
      guard({
        context: { trpcClient: { volume: { getAvailability: { query: async () => ({ available: false }) } } } },
        params: { projectId: "project-1" },
      })
    ).rejects.toEqual({ to: "/projects/$projectId", params: { projectId: "project-1" } })
  })
  it("honors service configuration even when the catalog has Cinder", async () => {
    const context = {
      trpcClient: { volume: { getAvailability: { query: async () => ({ available: true }) } } },
      deniedServices: ["volumes"],
    }
    await expect(guard({ context, params: { projectId: "project-1" } })).rejects.toEqual({
      to: "/projects/$projectId",
      params: { projectId: "project-1" },
    })
  })
  it("checks usable v3 endpoint availability for the target project", async () => {
    const query = vi.fn().mockResolvedValue({ available: true })
    await expect(
      guard({
        context: {
          trpcClient: {
            volume: { getAvailability: { query } },
          },
        },
        params: { projectId: "project-1" },
      })
    ).resolves.toBeUndefined()
    expect(query).toHaveBeenCalledWith({ project_id: "project-1" })
  })
  it("renders two peer resource tabs and navigates to snapshots", () => {
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByRole("navigation", { name: "Block storage resources" })).toBeInTheDocument()
    fireEvent.click(screen.getByText("Snapshots"))
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/volumes/snapshots",
      params: { projectId: "project-1" },
    })
  })
  it("suppresses the list shell on a detail route", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/volumes/$volumeId/" }]
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByRole("navigation", { name: "Block storage resources" })).not.toBeInTheDocument()
    expect(screen.getByTestId("scope-content")).toBeInTheDocument()
  })
  it("denies the Volumes outlet to a snapshot-only user while keeping resource navigation", () => {
    h.canListVolumes = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByRole("navigation", { name: "Block storage resources" })).toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("denies the Snapshots outlet to a volume-only user", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/volumes/snapshots/" }]
    h.canListSnapshots = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("checks detail read permission independently of list permission", () => {
    h.matches = [{ routeId: "/_auth/projects/$projectId/volumes/$volumeId/" }]
    h.canReadVolumes = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })
  it("shows unauthorized state instead of an empty scope when both lists are denied", () => {
    h.canListVolumes = false
    h.canListSnapshots = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
  })
  it("uses an inline loading Status while permissions load", () => {
    h.pending = true
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Loading Volumes...")).toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
  })
  it("reuses the shared route error without exposing raw failures", () => {
    h.error = new Error("private diagnostic")
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Failed to Load Volumes")).toBeInTheDocument()
    expect(screen.queryByText(/private diagnostic/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Try again"))
    expect(h.refetch).toHaveBeenCalled()
  })
  it("shows Session Expired without a scope-specific logout for query errors", () => {
    h.error = { data: { code: "UNAUTHORIZED" } }
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(h.terminate).not.toHaveBeenCalled()
  })
  it("shows Session Expired without a scope-specific logout for route-guard errors", () => {
    const ErrorComponent = Route.options.errorComponent as ComponentType<{ error: unknown }>
    render(
      <I18nProvider i18n={i18n}>
        <ErrorComponent error={{ data: { code: "UNAUTHORIZED" } }} />
      </I18nProvider>
    )
    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(h.terminate).not.toHaveBeenCalled()
  })
})
