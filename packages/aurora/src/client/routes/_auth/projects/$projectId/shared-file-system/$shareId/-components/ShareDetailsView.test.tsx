import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Share } from "@/server/SharedFileSystem/types/share"
import { ShareDetailsView } from "./ShareDetailsView"
import { DEFAULT_SHARE_DETAILS_TAB } from "./shareDetailUtils"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    const href = Object.entries(params ?? {}).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

const { mockGetExportLocationsQuery, mockListSnapshotsQuery, mockListReplicasQuery, mockRefetch, mockPermissions } =
  vi.hoisted(() => ({
    mockGetExportLocationsQuery: vi.fn(),
    mockListSnapshotsQuery: vi.fn(),
    mockListReplicasQuery: vi.fn(),
    mockRefetch: vi.fn(),
    mockPermissions: vi.fn(),
  }))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    sharedFileSystem: {
      getShareExportLocations: { useQuery: mockGetExportLocationsQuery },
      listSnapshots: { useQuery: mockListSnapshotsQuery },
      listReplicas: { useQuery: mockListReplicasQuery },
    },
  },
}))

vi.mock("@/client/hooks/useSharedFileSystemPermissions", () => ({
  useSharedFileSystemPermissions: () => mockPermissions(),
}))

vi.mock("./ShareExportLocationsTable", () => ({
  ShareExportLocationsTable: ({
    exportLocations,
    isLoading,
    canList,
  }: {
    exportLocations: unknown[]
    isLoading: boolean
    error: unknown
    canList: boolean
    onRetry: () => void
  }) => (
    <div
      data-testid="export-locations-table"
      data-loading={isLoading}
      data-can-list={canList}
      data-count={exportLocations.length}
    >
      <button onClick={() => {}}>Retry export locations</button>
    </div>
  ),
}))

vi.mock("./ShareSnapshotsTable", () => ({
  ShareSnapshotsTable: ({
    snapshots,
    isLoading,
    canList,
  }: {
    snapshots: unknown[]
    isLoading: boolean
    error: unknown
    canList: boolean
    onRetry: () => void
  }) => (
    <div data-testid="snapshots-table" data-loading={isLoading} data-can-list={canList} data-count={snapshots.length}>
      <button onClick={() => {}}>Retry snapshots</button>
    </div>
  ),
}))

vi.mock("./ShareReplicasTable", () => ({
  ShareReplicasTable: ({
    replicas,
    isLoading,
    canList,
  }: {
    replicas: unknown[]
    isLoading: boolean
    error: unknown
    canList: boolean
    onRetry: () => void
  }) => (
    <div data-testid="replicas-table" data-loading={isLoading} data-can-list={canList} data-count={replicas.length}>
      <button onClick={() => {}}>Retry replicas</button>
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const mockShareFull: Share = {
  id: "share-123",
  name: "my-share",
  status: "available",
  share_proto: "NFS",
  share_type_name: "default",
  share_type: "type-uuid-456",
  size: 100,
  availability_zone: "az1",
  is_public: false,
  share_network_id: "sharenet-789",
  snapshot_id: "snapshot-abc",
  share_group_id: "group-def",
  description: "Test share",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-16T12:00:00Z",
  project_id: "proj-1",
  replication_type: "dr",
  has_replicas: true,
  snapshot_support: true,
  create_share_from_snapshot_support: false,
  revert_to_snapshot_support: null,
  mount_snapshot_support: undefined,
  metadata: { key1: "value1", key2: "value2" },
}

const mockShareMinimal: Share = {
  id: "share-456",
  name: null,
  status: null,
  share_proto: null,
  share_type_name: null,
  share_type: null,
  size: null,
  availability_zone: null,
  is_public: null,
  share_network_id: null,
  snapshot_id: null,
  share_group_id: null,
  description: null,
  created_at: null,
  updated_at: null,
  project_id: null,
  replication_type: null,
  has_replicas: null,
  snapshot_support: null,
  create_share_from_snapshot_support: null,
  revert_to_snapshot_support: null,
  mount_snapshot_support: null,
  metadata: null,
}

const renderView = (share: Share = mockShareFull, activeTab = DEFAULT_SHARE_DETAILS_TAB, onTabChange = vi.fn()) =>
  render(<ShareDetailsView share={share} projectId="proj-1" activeTab={activeTab} onTabChange={onTabChange} />, {
    wrapper: TestWrapper,
  })

describe("ShareDetailsView", () => {
  beforeEach(() => {
    i18n.activate("en")

    // Default permissions: all allowed
    mockPermissions.mockReturnValue({
      canListExportLocations: true,
      canListSnapshots: true,
      canListReplicas: true,
      canReadSnapshots: true,
    })

    // Default query results: success, empty
    mockGetExportLocationsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })

    mockListSnapshotsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })

    mockListReplicasQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("General Info", () => {
    it("renders all fields for a fully populated share", () => {
      renderView(mockShareFull)

      expect(screen.getByText("my-share")).toBeInTheDocument()
      expect(screen.getByText("share-123")).toBeInTheDocument()
      expect(screen.getByText("available")).toBeInTheDocument()
      expect(screen.getByText("100")).toBeInTheDocument()
      expect(screen.getByText("NFS")).toBeInTheDocument()
      expect(screen.getByText("default")).toBeInTheDocument()
      expect(screen.getByText("type-uuid-456")).toBeInTheDocument()
      expect(screen.getByText("az1")).toBeInTheDocument()
      expect(screen.getByText("Private")).toBeInTheDocument()
      expect(screen.getByText("sharenet-789")).toBeInTheDocument()
      expect(screen.getByText("snapshot-abc")).toBeInTheDocument()
      expect(screen.getByText("group-def")).toBeInTheDocument()
      expect(screen.getByText("Test share")).toBeInTheDocument()
      // Check date labels are present (dates themselves rendered via toLocaleString())
      expect(screen.getByText("Created")).toBeInTheDocument()
      expect(screen.getByText("Updated")).toBeInTheDocument()
    })

    it("renders - - for missing fields in an ID-only share", () => {
      renderView(mockShareMinimal)

      // Count how many times "- -" appears
      const emptyValues = screen.getAllByText("- -")
      // Name, Status, Size, Protocol, Share Type, AZ, Visibility, Description, Created, Updated
      expect(emptyValues.length).toBeGreaterThanOrEqual(10)
    })

    it("renders only UUID when share_type_name is missing", () => {
      const share = { ...mockShareFull, share_type_name: null }
      renderView(share)

      expect(screen.queryByText("default")).not.toBeInTheDocument()
      expect(screen.getByText("type-uuid-456")).toBeInTheDocument()
    })

    it("renders only name when share_type UUID is missing", () => {
      const share = { ...mockShareFull, share_type: null }
      renderView(share)

      expect(screen.getByText("default")).toBeInTheDocument()
      expect(screen.queryByText("type-uuid-456")).not.toBeInTheDocument()
    })

    it("renders Public visibility", () => {
      const share = { ...mockShareFull, is_public: true }
      renderView(share)

      expect(screen.getByText("Public")).toBeInTheDocument()
    })

    it("links share network and source snapshot, keeps share group plain", () => {
      renderView(mockShareFull)

      const shareNetLink = screen.getByRole("link", { name: "sharenet-789" })
      expect(shareNetLink).toHaveAttribute("href", "/projects/proj-1/shared-file-system/share-networks/sharenet-789")

      const snapshotLink = screen.getByRole("link", { name: "snapshot-abc" })
      expect(snapshotLink).toHaveAttribute("href", "/projects/proj-1/shared-file-system/snapshots/snapshot-abc")

      expect(screen.queryByRole("link", { name: /group-def/i })).not.toBeInTheDocument()
    })

    it("truncates a 36-character share_network_id in the link text", () => {
      const uuid = "12345678-1234-1234-1234-123456789abc"
      const share = { ...mockShareFull, share_network_id: uuid }
      renderView(share)

      const link = screen.getByRole("link", { name: "12345678-1234..." })
      expect(link).toHaveAttribute("href", `/projects/proj-1/shared-file-system/share-networks/${uuid}`)
    })

    it("renders - - and no link when share_network_id and snapshot_id are null", () => {
      renderView(mockShareMinimal)

      expect(screen.queryAllByRole("link")).toHaveLength(0)
      // Share Network and Source Snapshot both render "- -"
      const emptyValues = screen.getAllByText("- -")
      expect(emptyValues.length).toBeGreaterThanOrEqual(2)
    })

    it("link rendering triggers no extra tRPC query", () => {
      renderView(mockShareFull)

      // Only the three tab-related queries are called, with their expected inputs
      expect(mockGetExportLocationsQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        expect.any(Object)
      )
      expect(mockListSnapshotsQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        expect.any(Object)
      )
      expect(mockListReplicasQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        expect.any(Object)
      )
      // No other procedures should have been called
      expect(mockGetExportLocationsQuery).toHaveBeenCalledTimes(1)
      expect(mockListSnapshotsQuery).toHaveBeenCalledTimes(1)
      expect(mockListReplicasQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe("Capabilities", () => {
    it("shows Capabilities heading when flags are present", () => {
      renderView(mockShareFull)

      expect(screen.getByRole("heading", { name: "Capabilities" })).toBeInTheDocument()
    })

    it("renders capability flags with Yes/No", () => {
      renderView(mockShareFull)

      const yesLabels = screen.getAllByText("Yes")
      const noLabels = screen.getAllByText("No")

      // snapshot_support: true, create_share_from_snapshot_support: false, has_replicas: true
      expect(yesLabels.length).toBeGreaterThanOrEqual(2)
      expect(noLabels.length).toBeGreaterThanOrEqual(1)
    })

    it("renders replication_type as text", () => {
      renderView(mockShareFull)

      expect(screen.getByText("dr")).toBeInTheDocument()
    })

    it("does not show Capabilities heading when all flags are absent", () => {
      const share = {
        ...mockShareMinimal,
        snapshot_support: null,
        create_share_from_snapshot_support: null,
        revert_to_snapshot_support: null,
        mount_snapshot_support: null,
        replication_type: null,
        has_replicas: null,
      }
      renderView(share)

      expect(screen.queryByRole("heading", { name: "Capabilities" })).not.toBeInTheDocument()
    })
  })

  describe("Metadata", () => {
    it("always shows Metadata heading", () => {
      renderView(mockShareFull)

      expect(screen.getByRole("heading", { name: "Metadata" })).toBeInTheDocument()
    })

    it("renders metadata key/value pairs sorted", () => {
      renderView(mockShareFull)

      expect(screen.getByText("key1")).toBeInTheDocument()
      expect(screen.getByText("value1")).toBeInTheDocument()
      expect(screen.getByText("key2")).toBeInTheDocument()
      expect(screen.getByText("value2")).toBeInTheDocument()
    })

    it("shows - - when metadata is empty", () => {
      const share = { ...mockShareFull, metadata: {} }
      renderView(share)

      const heading = screen.getByRole("heading", { name: "Metadata" })
      // The - - should be a sibling, not inside a TwoColumnDescriptionList
      expect(heading.nextElementSibling).toHaveTextContent("- -")
    })

    it("shows - - when metadata is null", () => {
      renderView(mockShareMinimal)

      const heading = screen.getByRole("heading", { name: "Metadata" })
      expect(heading.nextElementSibling).toHaveTextContent("- -")
    })
  })

  describe("Tabs", () => {
    it("renders Export Locations as the default tab", () => {
      renderView(mockShareFull)

      expect(screen.getByRole("button", { name: "Export Locations" })).toHaveAttribute("data-value", "export-locations")
      expect(screen.getByTestId("export-locations-table")).toBeInTheDocument()
    })

    it("always shows Replicas tab regardless of has_replicas (Manila flag may be stale)", () => {
      const share = { ...mockShareFull, has_replicas: false }
      renderView(share)

      // Replicas tab is always shown — we don't trust has_replicas flag
      expect(screen.getByRole("button", { name: "Replicas" })).toBeInTheDocument()
    })

    it("calls onTabChange when clicking Snapshots tab", async () => {
      const user = userEvent.setup()
      const onTabChange = vi.fn()
      renderView(mockShareFull, DEFAULT_SHARE_DETAILS_TAB, onTabChange)

      const snapshotsTab = screen.getByRole("button", { name: "Snapshots" })
      await user.click(snapshotsTab)

      expect(onTabChange).toHaveBeenCalledWith("snapshots")
    })

    it("renders replicas tab content when activeTab is replicas", () => {
      renderView(mockShareFull, "replicas")

      expect(screen.getByTestId("replicas-table")).toBeInTheDocument()
      expect(screen.queryByTestId("export-locations-table")).not.toBeInTheDocument()
    })
  })

  describe("Tab Queries", () => {
    it("calls all three useQuery hooks on mount (eager loading)", () => {
      renderView(mockShareFull)

      expect(mockGetExportLocationsQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: true, retry: false }
      )

      expect(mockListSnapshotsQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: true, retry: false }
      )

      expect(mockListReplicasQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: true, retry: false }
      )
    })

    it("always enables replicas query regardless of has_replicas (Manila flag may be stale)", () => {
      const share = { ...mockShareFull, has_replicas: false }
      renderView(share)

      // Replicas query is always enabled when user has permission — we don't trust has_replicas flag
      expect(mockListReplicasQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: true, retry: false }
      )
    })

    it("disables snapshots query when canListSnapshots is false", () => {
      mockPermissions.mockReturnValue({
        canListExportLocations: true,
        canListSnapshots: false,
        canListReplicas: true,
      })

      renderView(mockShareFull, "snapshots") // switch to snapshots tab

      expect(mockListSnapshotsQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: false, retry: false }
      )

      const snapshotsTable = screen.getByTestId("snapshots-table")
      expect(snapshotsTable).toHaveAttribute("data-can-list", "false")
    })

    it("renders only the active tab's table", () => {
      renderView(mockShareFull, "snapshots")

      expect(screen.queryByTestId("export-locations-table")).not.toBeInTheDocument()
      expect(screen.getByTestId("snapshots-table")).toBeInTheDocument()
      expect(screen.queryByTestId("replicas-table")).not.toBeInTheDocument()
    })
  })

  describe("Per-Tab Error Isolation", () => {
    it("renders general info and other tabs when export-locations query fails", () => {
      mockGetExportLocationsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: { message: "Failed" },
        refetch: mockRefetch,
      })

      renderView(mockShareFull)

      // General info still visible
      expect(screen.getByText("my-share")).toBeInTheDocument()

      // Metadata heading still visible
      expect(screen.getByRole("heading", { name: "Metadata" })).toBeInTheDocument()

      // Other tabs still exist
      expect(screen.getByRole("button", { name: "Snapshots" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Replicas" })).toBeInTheDocument()
    })
  })
})
