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

    it("does not render share network, snapshot and share group IDs as links", () => {
      renderView(mockShareFull)

      // getByRole would throw if these were links
      expect(screen.queryByRole("link", { name: /sharenet-789/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /snapshot-abc/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /group-def/i })).not.toBeInTheDocument()
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

    it("does not show Replicas tab when has_replicas is false", () => {
      const share = { ...mockShareFull, has_replicas: false }
      renderView(share)

      expect(screen.queryByRole("button", { name: "Replicas" })).not.toBeInTheDocument()
    })

    it("does not show Replicas tab when has_replicas is undefined", () => {
      const share = { ...mockShareFull, has_replicas: undefined }
      renderView(share)

      expect(screen.queryByRole("button", { name: "Replicas" })).not.toBeInTheDocument()
    })

    it("shows Replicas tab only when has_replicas is true", () => {
      renderView(mockShareFull)

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

    it("falls back to default tab when activeTab is invalid for the share", () => {
      const share = { ...mockShareFull, has_replicas: false }
      renderView(share, "replicas") // replicas tab doesn't exist

      expect(screen.getByTestId("export-locations-table")).toBeInTheDocument()
      expect(screen.queryByTestId("replicas-table")).not.toBeInTheDocument()
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

    it("disables replicas query when has_replicas is false", () => {
      const share = { ...mockShareFull, has_replicas: false }
      renderView(share)

      expect(mockListReplicasQuery).toHaveBeenCalledWith(
        { project_id: "proj-1", shareId: "share-123" },
        { enabled: false, retry: false }
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
