import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { ReactNode } from "react"
import { ResourceList } from "./ResourceList"
import { ResourceTable } from "./ResourceTable"
import { ResourceLink } from "./ResourceLink"
import { SourceVolumeLink } from "./SourceVolumeLink"
import { SnapshotDetails } from "./SnapshotDetails"
import { VolumeDetails } from "../$volumeId/-components/VolumeDetails"
import { volumeSchema } from "@/server/Volume/types/volume"

const volumeId = "123e4567-e89b-12d3-a456-426614174000"
const snapshotId = "123e4567-e89b-12d3-a456-426614174001"
const serverId = "123e4567-e89b-12d3-a456-426614174002"

const h = vi.hoisted(() => ({
  search: {} as Record<string, string | undefined>,
  catalog: [
    { type: "compute", name: "nova" },
    { type: "volumev3", name: "cinderv3" },
  ],
  denied: [] as string[],
  permissions: [true, true, true, true],
  permissionError: null as unknown,
  permissionPending: false,
  navigate: vi.fn(),
  volumeList: vi.fn(),
  snapshotList: vi.fn(),
  volumeShow: vi.fn(),
  snapshotShow: vi.fn(),
  refetch: vi.fn(),
  crumb: vi.fn(),
  volumes: [] as unknown[],
  snapshots: [] as unknown[],
  volume: undefined as unknown,
  snapshot: undefined as unknown,
  error: null as unknown,
  snapshotError: null as unknown,
  snapshotPending: false,
  snapshotFetching: false,
  serverList: vi.fn(),
  serverPermissions: vi.fn(),
  writeText: vi.fn(),
  pending: false,
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => h.navigate,
  useSearch: () => h.search,
  useParams: () => ({ projectId: "project-1" }),
  useLoaderData: () => ({ projectId: "project-1", availableServices: h.catalog }),
  useRouteContext: () => ({ deniedServices: h.denied }),
  Link: ({ to, params, children, ...props }: { to: string; params: Record<string, string>; children: ReactNode }) => {
    const href = to.replace(/\$(\w+)/g, (_, key: string) => params[key])
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))
vi.mock("@/client/trpcClient", () => ({
  trpcClient: { auth: { terminateUserSession: { mutate: async () => undefined } } },
  trpcReact: {
    compute: {
      canUser: {
        useQuery: h.serverPermissions,
      },
      getServersByProjectId: {
        useQuery: h.serverList,
      },
    },
    volume: {
      getAvailability: {
        useQuery: () => ({
          data: { available: h.catalog.some((entry) => ["volumev3", "block-storage", "volume"].includes(entry.type)) },
          isPending: false,
          error: null,
          refetch: async () => ({ data: { available: true } }),
        }),
      },
      canUser: {
        useQuery: () => ({
          data: h.permissions,
          isPending: h.permissionPending,
          error: h.permissionError,
          refetch: h.refetch,
        }),
      },
      listVolumes: {
        useQuery: (...args: unknown[]) => {
          h.volumeList(...args)
          return {
            data: h.volumes,
            isPending: h.pending,
            error: h.error,
            refetch: h.refetch,
            dataUpdatedAt: Date.now(),
            isFetching: false,
          }
        },
      },
      listSnapshots: {
        useQuery: (...args: unknown[]) => {
          h.snapshotList(...args)
          return {
            data: h.snapshots,
            isPending: h.pending || h.snapshotPending,
            error: h.snapshotError,
            refetch: h.refetch,
            dataUpdatedAt: Date.now(),
            isFetching: h.snapshotFetching,
          }
        },
      },
      getVolumeById: {
        useQuery: (...args: unknown[]) => {
          h.volumeShow(...args)
          return {
            data: h.volume,
            isPending: h.pending,
            isSuccess: Boolean(h.volume),
            error: h.error,
            refetch: h.refetch,
            isFetching: false,
          }
        },
      },
      getSnapshotById: {
        useQuery: (...args: unknown[]) => {
          h.snapshotShow(...args)
          return { data: h.snapshot, isPending: h.pending, error: h.error, refetch: h.refetch, isFetching: false }
        },
      },
    },
  },
}))
vi.mock("@/client/hooks/useSetBreadcrumb", () => ({ useSetBreadcrumb: (...args: unknown[]) => h.crumb(...args) }))
vi.mock("@/client/components/ContentHeader/ContentHeader", () => ({
  ContentHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}))
vi.mock("@/client/components/ListToolbar/SortInput", () => ({
  SortInput: ({ onSortDirectionChange }: { onSortDirectionChange: (value: string) => void }) => (
    <button onClick={() => onSortDirectionChange("desc")}>Reverse sort</button>
  ),
}))
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({
  FiltersInput: ({ onChange }: { onChange: (value: { name: string; value: string }) => void }) => (
    <button onClick={() => onChange({ name: "status", value: "available" })}>Filter available</button>
  ),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

beforeAll(() => {
  i18n.load("en", {})
  i18n.activate("en")
  Element.prototype.scrollIntoView = vi.fn()
})
beforeEach(() => {
  vi.clearAllMocks()
  h.writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: h.writeText },
    configurable: true,
  })
  h.search = {}
  h.denied = []
  h.catalog = [
    { type: "compute", name: "nova" },
    { type: "volumev3", name: "cinderv3" },
  ]
  h.permissions = [true, true, true, true]
  h.permissionError = null
  h.permissionPending = false
  h.error = null
  h.snapshotError = null
  h.snapshotPending = false
  h.snapshotFetching = false
  h.pending = false
  h.volumes = [
    volumeSchema.parse({
      id: volumeId,
      name: "Ubuntu",
      size: 10,
      status: "available",
      bootable: "false",
      attachments: [{ attachment_id: "attachment-1", server_id: serverId, device: "/dev/vdb" }],
    }),
  ]
  h.volume = h.volumes[0]
  h.snapshots = [{ id: snapshotId, name: "Saved state", volume_id: volumeId, status: "available", size: 10 }]
  h.snapshot = h.snapshots[0]
})

describe("block storage lists", () => {
  it.each([false, true])("omits the count bar and fetch timestamps (snapshots: %s)", (snapshots) => {
    render(<ResourceList projectId="project-1" snapshots={snapshots} />, { wrapper })
    expect(screen.queryByText(/Showing \d+ of \d+/)).not.toBeInTheDocument()
    const search = screen.getByPlaceholderText("Search…")
    const table = screen.getByTestId(snapshots ? "snapshots-table" : "volumes-table")
    // The filter/search toolbar is the final header element, with no count bar below it.
    expect(table.previousElementSibling?.lastElementChild).toContainElement(search)
    expect(screen.queryByText(/Last fetched:/)).not.toBeInTheDocument()
  })

  it.each([undefined, "", volumeId])("does not repeat the ID below an ID used as the name (%s)", (name) => {
    render(
      <ResourceTable
        items={[volumeSchema.parse({ id: volumeId, name })]}
        snapshots={false}
        projectId="project-1"
        canRead
      />,
      { wrapper }
    )
    expect(screen.getAllByText(volumeId)).toHaveLength(1)
    expect(screen.getByText(volumeId)).not.toHaveClass("text-theme-light")
  })

  it.each([false, true])("does not show copy controls in resource lists (snapshots: %s)", (snapshots) => {
    render(<ResourceList projectId="project-1" snapshots={snapshots} />, { wrapper })
    const id = snapshots ? snapshotId : volumeId
    expect(screen.getByText(id)).toBeInTheDocument()
    expect(screen.getByText(id)).toHaveClass("text-theme-light", "text-sm")
    expect(screen.queryByRole("button", { name: /^Copy .* to clipboard$/ })).not.toBeInTheDocument()
  })

  it("does not show copy controls for inaccessible relationship IDs in lists", () => {
    const view = render(<ResourceList projectId="project-1" />, { wrapper })
    expect(screen.getByText(serverId)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Copy .* to clipboard$/ })).not.toBeInTheDocument()
    h.volumes = []
    view.rerender(<ResourceList projectId="project-1" snapshots />)
    expect(screen.getByText(volumeId)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Copy .* to clipboard$/ })).not.toBeInTheDocument()
  })

  it("places resource tabs beside sorting and navigates to snapshots", () => {
    render(<ResourceList projectId="project-1" />, { wrapper })
    const tabs = screen.getByRole("navigation", { name: "Block storage resources" })
    expect(within(tabs).getByText("Volumes")).toHaveAttribute("aria-current", "true")
    expect(tabs.parentElement).toContainElement(screen.getByText("Reverse sort"))
    fireEvent.click(within(tabs).getByText("Snapshots"))
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/volumes/snapshots",
      params: { projectId: "project-1" },
    })
  })

  it("keeps the active resource tab in sync with the route", () => {
    const view = render(<ResourceList projectId="project-1" />, { wrapper })
    const tabs = screen.getByRole("navigation", { name: "Block storage resources" })
    expect(within(tabs).getByText("Volumes")).toHaveClass("juno-navigation-item-active")
    view.rerender(<ResourceList projectId="project-1" snapshots />)
    expect(within(tabs).getByText("Snapshots")).toHaveClass("juno-navigation-item-active")
    view.rerender(<ResourceList projectId="project-1" />)
    expect(within(tabs).getByText("Volumes")).toHaveClass("juno-navigation-item-active")
  })

  it("renders the specified volume columns, real boolean values, and server links", () => {
    render(<ResourceList projectId="project-1" />, { wrapper })
    const table = screen.getByTestId("volumes-table")
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent)
    ).toEqual([
      "Name / ID",
      "Availability Zone",
      "Size (GiB)",
      "Volume type",
      "Bootable",
      "Attached To",
      "Created",
      "Status",
      "",
    ])
    expect(screen.getByText("No")).toBeInTheDocument()
    const server = screen.getByRole("link", { name: serverId })
    expect(server).toHaveAttribute("href", `/projects/project-1/compute/instances/${serverId}`)
    expect(server).toHaveClass("hover:underline")
    fireEvent.click(server)
    expect(h.navigate).not.toHaveBeenCalled()
    expect(h.volumeList).toHaveBeenCalledWith({ project_id: "project-1" }, expect.objectContaining({ enabled: true }))
    expect(h.snapshotList).toHaveBeenCalledWith(
      { project_id: "project-1" },
      expect.objectContaining({ enabled: false })
    )
  })

  it("updates URL search, sorting, and filters without changing API inputs", () => {
    render(<ResourceList projectId="project-1" />, { wrapper })
    fireEvent.input(screen.getByPlaceholderText("Search…"), { target: { value: "ubuntu" } })
    expect(h.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ search: { search: "ubuntu" } }))
    fireEvent.click(screen.getByText("Reverse sort"))
    expect(h.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ search: { sortDirection: "desc" } }))
    fireEvent.click(screen.getByText("Filter available"))
    expect(h.navigate).toHaveBeenLastCalledWith(expect.objectContaining({ search: { status: "available" } }))
    expect(h.volumeList.mock.calls.every(([input]) => Object.keys(input).join() === "project_id")).toBe(true)
  })

  it("clear all preserves search and sort", () => {
    h.search = { status: "available", bootable: "false", search: "ubuntu", sortDirection: "desc" }
    render(<ResourceList projectId="project-1" />, { wrapper })
    fireEvent.click(screen.getByText("Clear all"))
    expect(h.navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: {
          search: "ubuntu",
          sortDirection: "desc",
          status: undefined,
          bootable: undefined,
          volume_type: undefined,
          availability_zone: undefined,
        },
      })
    )
  })

  it("offers clear all even for a single active filter", () => {
    h.search = { status: "available" }
    render(<ResourceList projectId="project-1" />, { wrapper })
    expect(screen.getByText("Clear all")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Clear all" })).toHaveClass("juno-button-xs-size")
  })

  it("distinguishes project-empty from filtered-empty", () => {
    h.search = { search: "no-match" }
    const view = render(<ResourceList projectId="project-1" />, { wrapper })
    expect(screen.getByText("No Volumes Match Your Filters")).toBeInTheDocument()
    h.volumes = []
    view.rerender(<ResourceList projectId="project-1" />)
    expect(screen.getByText("No Volumes in This Project")).toBeInTheDocument()
  })

  it("loads all snapshots without a volume filter and links the source volume", () => {
    render(<ResourceList projectId="project-1" snapshots />, { wrapper })
    expect(h.snapshotList).toHaveBeenCalledWith({ project_id: "project-1" }, expect.objectContaining({ enabled: true }))
    const source = screen.getByRole("link", { name: "Ubuntu" })
    expect(source).toHaveAttribute("href", `/projects/project-1/volumes/${volumeId}`)
    expect(source).toHaveClass("text-inherit", "hover:underline")
    expect(source.parentElement).toContainElement(screen.getByText(volumeId))
    expect(screen.getByText(volumeId)).toHaveClass("text-theme-light", "text-sm")
    fireEvent.click(source)
    expect(h.navigate).not.toHaveBeenCalled()
  })

  it.each([false, true])("does not offer manual refresh in lists (snapshots: %s)", (snapshots) => {
    render(<ResourceList projectId="project-1" snapshots={snapshots} />, { wrapper })
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument()
    expect(h.refetch).not.toHaveBeenCalled()
  })

  it.each(["FORBIDDEN", "UNAUTHORIZED", "INTERNAL_SERVER_ERROR"])(
    "handles %s without showing stale resources",
    (code) => {
      h.error = { data: { code } }
      render(<ResourceList projectId="project-1" />, { wrapper })
      expect(screen.queryByTestId("volumes-table")).not.toBeInTheDocument()
      expect(
        screen.getByText(
          code === "FORBIDDEN"
            ? "Access Denied"
            : code === "UNAUTHORIZED"
              ? "Session Expired"
              : "Failed to Load Volumes"
        )
      ).toBeInTheDocument()
    }
  )

  it("does not enable a list query when its permission is denied", () => {
    h.permissions = [false, true, true, true]
    render(<ResourceList projectId="project-1" />, { wrapper })
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(h.volumeList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
  })

  it("row clicks and keyboard activation open details", () => {
    render(
      <ResourceTable items={[volumeSchema.parse({ id: volumeId })]} snapshots={false} projectId="project-1" canRead />,
      { wrapper }
    )
    const row = screen.getByTestId(`storage-row-${volumeId}`)
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: "Enter" })
    expect(h.navigate).toHaveBeenCalledTimes(2)
    expect(h.navigate).toHaveBeenLastCalledWith({
      to: "/projects/$projectId/volumes/$volumeId",
      params: { projectId: "project-1", volumeId },
    })
  })

  it("keeps names as plain text and opens details through the row", () => {
    render(
      <ResourceTable
        items={[volumeSchema.parse({ id: volumeId, name: "Ubuntu" })]}
        snapshots={false}
        projectId="project-1"
        canRead
      />,
      { wrapper }
    )
    fireEvent.click(screen.getByText("Ubuntu"))
    expect(screen.queryByRole("link", { name: "Ubuntu" })).not.toBeInTheDocument()
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/volumes/$volumeId",
      params: { projectId: "project-1", volumeId },
    })
  })
})

describe("block storage details and links", () => {
  it("shows populated attachments and snapshots together as sections instead of tabs", () => {
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByRole("heading", { name: "Attachments", level: 2 })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Snapshots of this volume", level: 2 })).toBeInTheDocument()
    expect(screen.getByTestId("attachments-table")).toBeInTheDocument()
    expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Volume relationships" })).not.toBeInTheDocument()
  })

  it.each([undefined, null, {}])("hides empty metadata in both detail views (%s)", (metadata) => {
    h.volume = volumeSchema.parse({ id: volumeId, metadata })
    h.snapshot = { id: snapshotId, volume_id: volumeId, metadata }
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByRole("heading", { name: "Metadata" })).not.toBeInTheDocument()
    view.rerender(<SnapshotDetails projectId="project-1" snapshotId={snapshotId} />)
    expect(screen.queryByRole("heading", { name: "Metadata" })).not.toBeInTheDocument()
  })

  it("keeps populated metadata in both detail views", () => {
    const metadata = { purpose: "database" }
    h.volume = volumeSchema.parse({ id: volumeId, metadata })
    h.snapshot = { id: snapshotId, volume_id: volumeId, metadata }
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByRole("heading", { name: "Metadata" })).toBeInTheDocument()
    expect(screen.getByText("purpose")).toBeInTheDocument()
    expect(screen.getByText("database")).toBeInTheDocument()
    view.rerender(<SnapshotDetails projectId="project-1" snapshotId={snapshotId} />)
    expect(screen.getByRole("heading", { name: "Metadata" })).toBeInTheDocument()
    expect(screen.getByText("purpose")).toBeInTheDocument()
    expect(screen.getByText("database")).toBeInTheDocument()
  })

  it.each([undefined, null, []])("hides empty attachments and selects populated snapshots (%s)", (attachments) => {
    h.volume = volumeSchema.parse({ id: volumeId, attachments })
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByText("Attachments")).not.toBeInTheDocument()
    expect(screen.queryByTestId("attachments-table")).not.toBeInTheDocument()
    expect(screen.queryByText("No Completed Attachments")).not.toBeInTheDocument()
    expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
  })

  it("hides empty snapshots while keeping populated attachments", () => {
    h.snapshots = []
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
    expect(screen.queryByTestId("snapshots-table")).not.toBeInTheDocument()
    expect(screen.getByTestId("attachments-table")).toBeInTheDocument()
  })

  it("hides relationships entirely when both collections are empty", () => {
    h.volume = volumeSchema.parse({ id: volumeId, attachments: [] })
    h.snapshots = []
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByRole("navigation", { name: "Volume relationships" })).not.toBeInTheDocument()
    expect(screen.queryByText("Attachments")).not.toBeInTheDocument()
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
    expect(screen.queryByText("No Snapshots for This Volume")).not.toBeInTheDocument()
    expect(screen.getByTestId("volume-detail")).toBeInTheDocument()
  })

  it("keeps attachments visible when the snapshots collection becomes empty", () => {
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
    h.snapshots = []
    view.rerender(<VolumeDetails projectId="project-1" volumeId={volumeId} />)
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
    expect(screen.getByTestId("attachments-table")).toBeInTheDocument()
  })

  it("keeps snapshots visible when the attachments collection becomes empty", () => {
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByTestId("attachments-table")).toBeInTheDocument()
    h.volume = volumeSchema.parse({ id: volumeId, attachments: [] })
    view.rerender(<VolumeDetails projectId="project-1" volumeId={volumeId} />)
    expect(screen.queryByText("Attachments")).not.toBeInTheDocument()
    expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
  })

  it("does not flash optional sections before an empty snapshot result is confirmed", () => {
    h.volume = volumeSchema.parse({ id: volumeId, attachments: [] })
    h.snapshots = []
    h.snapshotPending = true
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByText("Loading Volume Details...")).toBeInTheDocument()
    expect(screen.queryByTestId("volume-detail")).not.toBeInTheDocument()
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
    h.snapshotPending = false
    view.rerender(<VolumeDetails projectId="project-1" volumeId={volumeId} />)
    expect(screen.queryByText("Loading Volume Details...")).not.toBeInTheDocument()
    expect(screen.getByTestId("volume-detail")).toBeInTheDocument()
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
  })

  it("reveals populated relationships together after snapshots finish loading", () => {
    h.snapshotPending = true
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByText("Loading Volume Details...")).toBeInTheDocument()
    expect(screen.queryByText("Attachments")).not.toBeInTheDocument()
    expect(screen.queryByText("Snapshots of this volume")).not.toBeInTheDocument()
    h.snapshotPending = false
    view.rerender(<VolumeDetails projectId="project-1" volumeId={volumeId} />)
    expect(screen.getByTestId("attachments-table")).toBeInTheDocument()
    expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
  })

  it("keeps the detail layout mounted during background snapshot refetches", () => {
    const view = render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    const detail = screen.getByTestId("volume-detail")
    const table = screen.getByTestId("snapshots-table")
    h.snapshotFetching = true
    view.rerender(<VolumeDetails projectId="project-1" volumeId={volumeId} />)
    expect(screen.getByTestId("volume-detail")).toBe(detail)
    expect(screen.getByTestId("snapshots-table")).toBe(table)
    expect(screen.queryByText("Loading Volume Details...")).not.toBeInTheDocument()
  })

  it("does not wait for a disabled snapshot query when list permission is denied", () => {
    h.permissions = [true, true, false, false]
    h.snapshotPending = true
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByTestId("volume-detail")).toBeInTheDocument()
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.queryByText("Loading Volume Details...")).not.toBeInTheDocument()
  })

  it("shows volume errors without waiting for snapshots", () => {
    h.error = { data: { code: "NOT_FOUND" } }
    h.snapshotPending = true
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByText("Resource Not Accessible")).toBeInTheDocument()
    expect(screen.queryByText("Loading Volume Details...")).not.toBeInTheDocument()
  })

  it.each(["FORBIDDEN", "UNAUTHORIZED", "INTERNAL_SERVER_ERROR"])(
    "keeps snapshot %s feedback even without relationship data",
    (code) => {
      h.volume = volumeSchema.parse({ id: volumeId, attachments: [] })
      h.snapshots = []
      h.snapshotError = { data: { code } }
      render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
      expect(screen.getByText("Snapshots of this volume")).toBeInTheDocument()
      expect(
        screen.getByText(
          code === "FORBIDDEN"
            ? "Access Denied"
            : code === "UNAUTHORIZED"
              ? "Session Expired"
              : "Failed to Load Snapshots"
        )
      ).toBeInTheDocument()
      expect(screen.getByTestId("volume-detail")).toBeInTheDocument()
    }
  )

  it("opens snapshots through the full row in volume details without name links or copy controls", () => {
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    const table = screen.getByTestId("snapshots-table")
    const name = within(table).getByText("Saved state")
    expect(within(table).queryByRole("link", { name: "Saved state" })).not.toBeInTheDocument()
    expect(within(table).queryByRole("button", { name: /^Copy .* to clipboard$/ })).not.toBeInTheDocument()
    fireEvent.click(name)
    expect(h.navigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/volumes/snapshots/$snapshotId",
      params: { projectId: "project-1", snapshotId },
    })
  })

  it("links the source volume without a copy control in snapshot details", () => {
    render(<SnapshotDetails projectId="project-1" snapshotId={snapshotId} />, { wrapper })
    expect(screen.queryByRole("button", { name: `Copy ${volumeId} to clipboard` })).not.toBeInTheDocument()
    expect(screen.getByText(volumeId)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ubuntu" })).toHaveAttribute(
      "href",
      `/projects/project-1/volumes/${volumeId}`
    )
  })

  it.each(["volume", "snapshot"])("copies the %s detail ID", async (resource) => {
    render(
      resource === "volume" ? (
        <VolumeDetails projectId="project-1" volumeId={volumeId} />
      ) : (
        <SnapshotDetails projectId="project-1" snapshotId={snapshotId} />
      ),
      { wrapper }
    )
    const id = resource === "volume" ? volumeId : snapshotId
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `Copy ${id} to clipboard` })))
    expect(h.writeText).toHaveBeenCalledWith(id)
  })

  it("keeps unlinked attachment IDs copyable without navigating", async () => {
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    const attachmentId = screen.getByText("attachment-1")
    expect(attachmentId).toHaveClass("select-text")
    expect(attachmentId.closest("a")).toBeNull()
    const button = screen.getByRole("button", { name: "Copy attachment-1 to clipboard" })
    expect(button.closest("a")).toBeNull()
    await act(async () => fireEvent.click(button))
    expect(h.writeText).toHaveBeenLastCalledWith("attachment-1")
    expect(h.navigate).not.toHaveBeenCalled()
    expect(screen.getByRole("link", { name: serverId })).toBeInTheDocument()
  })

  it("links server IDs without copy controls in details", () => {
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByRole("button", { name: `Copy ${serverId} to clipboard` })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: serverId })).toBeInTheDocument()
    expect(h.navigate).not.toHaveBeenCalled()
  })

  it.each(["volume", "snapshot", "instance"] as const)(
    "never adds a copy control to a linked %s, even when copyable is requested",
    (resource) => {
      const id = resource === "volume" ? volumeId : resource === "snapshot" ? snapshotId : serverId
      render(<ResourceLink resource={resource} id={id} copyable />, { wrapper })
      expect(screen.getByRole("link", { name: id })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: `Copy ${id} to clipboard` })).not.toBeInTheDocument()
    }
  )

  it("keeps unlinked server IDs copyable in details", async () => {
    h.catalog = [{ type: "volumev3", name: "cinderv3" }]
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.queryByRole("link", { name: serverId })).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `Copy ${serverId} to clipboard` })))
    expect(h.writeText).toHaveBeenCalledWith(serverId)
  })

  it("keeps unresolved source volume IDs copyable in snapshot details", async () => {
    h.volumes = []
    render(<SnapshotDetails projectId="project-1" snapshotId={snapshotId} />, { wrapper })
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `Copy ${volumeId} to clipboard` })))
    expect(h.writeText).toHaveBeenCalledWith(volumeId)
  })

  it.each([undefined, "", volumeId])("shows only the ID for a source volume whose name is %s", (name) => {
    h.volumes = [volumeSchema.parse({ id: volumeId, name })]
    render(<SourceVolumeLink id={volumeId} />, { wrapper })
    expect(screen.getAllByText(volumeId)).toHaveLength(1)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByText(volumeId)).not.toHaveClass("text-theme-light")
    expect(h.volumeShow).not.toHaveBeenCalled()
  })

  it.each(["missing", "error"])("does not link a source volume when its lookup is %s", (state) => {
    if (state === "missing") h.volumes = []
    if (state === "error") h.error = { data: { code: "INTERNAL_SERVER_ERROR" } }
    render(<SourceVolumeLink id={volumeId} />, { wrapper })
    expect(screen.getByText(volumeId).closest("a")).toBeNull()
  })

  it("shows a plain ID without fetching volume names when list permission is denied", () => {
    h.permissions = [false, true, true, true]
    render(<SourceVolumeLink id={volumeId} />, { wrapper })
    expect(screen.getByText(volumeId).closest("a")).toBeNull()
    expect(h.volumeList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
  })

  it("shows a plain ID without fetching names when volume read permission is denied", () => {
    h.permissions = [true, false, true, true]
    render(<SourceVolumeLink id={volumeId} />, { wrapper })
    expect(screen.getByText(volumeId).closest("a")).toBeNull()
    expect(h.volumeList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
  })

  it("does not fetch names or link when the volumes service is disabled", () => {
    h.denied = ["volumes"]
    render(<SourceVolumeLink id={volumeId} />, { wrapper })
    expect(screen.getByText(volumeId).closest("a")).toBeNull()
    expect(h.volumeList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
  })

  it.each(["volume", "snapshot"])("does not offer manual refresh in %s details", (resource) => {
    render(
      resource === "volume" ? (
        <VolumeDetails projectId="project-1" volumeId={volumeId} />
      ) : (
        <SnapshotDetails projectId="project-1" snapshotId={snapshotId} />
      ),
      { wrapper }
    )
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument()
    expect(h.refetch).not.toHaveBeenCalled()
  })

  it("uses the direct show endpoint and renders the real attachment ID", () => {
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(h.volumeShow).toHaveBeenCalledWith(
      { project_id: "project-1", volumeId },
      expect.objectContaining({ enabled: true })
    )
    expect(h.snapshotList).toHaveBeenCalledWith(
      { project_id: "project-1", volumeId },
      expect.objectContaining({ enabled: true })
    )
    expect(screen.getByText("attachment-1")).toBeInTheDocument()
    expect(screen.getByText(serverId)).toHaveAttribute("href", `/projects/project-1/compute/instances/${serverId}`)
    expect(screen.getByText(serverId)).toHaveClass("hover:underline")
    expect(h.crumb).toHaveBeenCalledWith("/_auth/projects/$projectId/volumes/$volumeId/", "Ubuntu")
  })

  it("isolates snapshot-section errors from volume metadata", () => {
    h.snapshotError = { data: { code: "INTERNAL_SERVER_ERROR" } }
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByRole("heading", { name: "Ubuntu" })).toBeInTheDocument()
    expect(screen.getByText("Failed to Load Snapshots")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Try again"))
    expect(h.refetch).toHaveBeenCalled()
  })

  it("keeps snapshot permissions independent of volume read access", () => {
    h.permissions = [true, true, false, false]
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByTestId("volume-detail")).toBeInTheDocument()
    expect(h.snapshotList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }))
    expect(screen.getByText("Access Denied")).toBeInTheDocument()
  })

  it("renders snapshot details and source link with no volume-show lookup", () => {
    render(<SnapshotDetails projectId="project-1" snapshotId={snapshotId} />, { wrapper })
    expect(screen.getByTestId("snapshot-detail")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ubuntu" })).toHaveAttribute(
      "href",
      `/projects/project-1/volumes/${volumeId}`
    )
    expect(h.volumeShow).not.toHaveBeenCalled()
    expect(h.snapshotShow).toHaveBeenCalledWith(
      { project_id: "project-1", snapshotId },
      expect.objectContaining({ enabled: true })
    )
  })

  it("degrades instance links when compute is absent or disabled", () => {
    h.catalog = [{ type: "volumev3", name: "cinderv3" }]
    const view = render(<ResourceLink resource="instance" id={serverId} />, { wrapper })
    expect(screen.getByText(serverId).closest("a")).toBeNull()
    h.catalog.push({ type: "compute", name: "nova" })
    h.denied = ["instances"]
    view.rerender(<ResourceLink resource="instance" id={serverId} />)
    expect(screen.getByText(serverId).closest("a")).toBeNull()
    expect(h.volumeShow).not.toHaveBeenCalled()
    expect(h.serverList).not.toHaveBeenCalled()
    expect(h.serverPermissions).not.toHaveBeenCalled()
  })

  it("links attached instances without checking their existence or list permission", () => {
    render(<ResourceLink resource="instance" id={serverId} />, { wrapper })
    expect(screen.getByRole("link", { name: serverId })).toHaveAttribute(
      "href",
      `/projects/project-1/compute/instances/${serverId}`
    )
    expect(h.serverList).not.toHaveBeenCalled()
    expect(h.serverPermissions).not.toHaveBeenCalled()
  })

  it("renders all attached server IDs as separate links", () => {
    const secondId = "123e4567-e89b-12d3-a456-426614174003"
    render(
      <ResourceTable
        items={[volumeSchema.parse({ id: volumeId, attachments: [{ server_id: serverId }, { server_id: secondId }] })]}
        snapshots={false}
        projectId="project-1"
        canRead
      />,
      { wrapper }
    )
    for (const id of [serverId, secondId]) {
      expect(screen.getByRole("link", { name: id })).toHaveAttribute(
        "href",
        `/projects/project-1/compute/instances/${id}`
      )
    }
  })

  it("degrades intra-scope links when read permission is denied", () => {
    h.permissions = [true, false, true, false]
    render(<ResourceLink resource="snapshot" id={snapshotId} />, { wrapper })
    expect(screen.getByText(snapshotId).closest("a")).toBeNull()
  })

  it("degrades intra-scope links when Cinder disappears from the catalog", () => {
    h.catalog = [{ type: "compute", name: "nova" }]
    render(<ResourceLink resource="volume" id={volumeId} />, { wrapper })
    expect(screen.getByText(volumeId).closest("a")).toBeNull()
  })

  it("renders an inaccessible detail state for 404", () => {
    h.error = { data: { code: "NOT_FOUND" } }
    render(<VolumeDetails projectId="project-1" volumeId={volumeId} />, { wrapper })
    expect(screen.getByText("Resource Not Accessible")).toBeInTheDocument()
  })
})
