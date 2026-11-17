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
  navigate: vi.fn(),
}))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ projectId: "project-1" }) }),
  redirect: (options: unknown) => options,
  useMatches: () => h.matches,
  useNavigate: () => h.navigate,
  Outlet: () => <div data-testid="scope-content" />,
}))
vi.mock("@/client/hooks/useVolumePermissions", () => ({
  useVolumePermissions: () => ({
    isPending: false,
    error: null,
    canListVolumes: h.canListVolumes,
    canListSnapshots: h.canListSnapshots,
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
  h.matches = [{ routeId: "/_auth/projects/$projectId/volumes/" }]
  h.canListVolumes = true
  h.canListSnapshots = true
})

describe("volume scope routing", () => {
  it("redirects to the project when Cinder is absent", async () => {
    await expect(
      guard({
        context: { trpcClient: { auth: { getAvailableServices: { query: async () => [] } } } },
        params: { projectId: "project-1" },
      })
    ).rejects.toEqual({ to: "/projects/$projectId", params: { projectId: "project-1" } })
  })
  it("honors service configuration even when the catalog has Cinder", async () => {
    const context = {
      trpcClient: { auth: { getAvailableServices: { query: async () => [{ type: "volumev3", name: "cinderv3" }] } } },
      deniedServices: ["volumes"],
    }
    await expect(guard({ context, params: { projectId: "project-1" } })).rejects.toEqual({
      to: "/projects/$projectId",
      params: { projectId: "project-1" },
    })
  })
  it("accepts a Cinder catalog with a deployment-specific service name", async () => {
    await expect(
      guard({
        context: {
          trpcClient: {
            auth: { getAvailableServices: { query: async () => [{ type: "block-storage", name: "custom-cinder" }] } },
          },
        },
        params: { projectId: "project-1" },
      })
    ).resolves.toBeUndefined()
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
  it("shows unauthorized state instead of an empty scope when both lists are denied", () => {
    h.canListVolumes = false
    h.canListSnapshots = false
    render(
      <I18nProvider i18n={i18n}>
        <Layout />
      </I18nProvider>
    )
    expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
    expect(screen.queryByTestId("scope-content")).not.toBeInTheDocument()
  })
})
