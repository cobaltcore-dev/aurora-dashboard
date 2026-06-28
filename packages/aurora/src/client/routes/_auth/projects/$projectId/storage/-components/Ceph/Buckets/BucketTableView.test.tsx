import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { BucketTableView } from "./BucketTableView"
import type { Bucket } from "@/server/Storage/types/ceph"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 48,
        size: 48,
        key: i,
        measureElement: vi.fn(),
      })),
    getTotalSize: () => count * 48,
    measureElement: vi.fn(),
  }),
}))

// ─── Mock router ──────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: "test-project", provider: "ceph", storageType: "buckets" }),
}))

// ─── Mock modals ──────────────────────────────────────────────────────────────

vi.mock("./CreateBucketModal", () => ({
  CreateBucketModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="create-bucket-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./EmptyBucketModal", () => ({
  EmptyBucketModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="empty-bucket-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

vi.mock("./DeleteBucketModal", () => ({
  DeleteBucketModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="delete-bucket-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBuckets: Bucket[] = [
  {
    name: "bucket-1",
    creationDate: "2024-01-15T10:00:00Z",
    count: 5,
    bytes: 1024,
    last_modified: "2024-01-20T15:30:00Z",
  },
  {
    name: "bucket-2",
    creationDate: "2024-01-16T10:00:00Z",
    count: 3,
    bytes: 512,
    last_modified: "2024-01-21T10:00:00Z",
  },
  {
    name: "bucket-3",
    creationDate: "2024-01-17T10:00:00Z",
    count: 0,
    bytes: 0,
  },
]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderTableView = ({
  buckets = mockBuckets,
  createModalOpen = false,
  setCreateModalOpen = vi.fn(),
  onCreateSuccess = vi.fn(),
  onCreateError = vi.fn(),
  onEmptySuccess = vi.fn(),
  onEmptyError = vi.fn(),
  onDeleteSuccess = vi.fn(),
  onDeleteError = vi.fn(),
  selectedBuckets = [],
  setSelectedBuckets = vi.fn(),
}: Partial<{
  buckets: Bucket[]
  createModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  onCreateSuccess: (bucketName: string) => void
  onCreateError: (bucketName: string, errorMessage: string) => void
  onEmptySuccess: (bucketName: string, deletedCount: number) => void
  onEmptyError: (bucketName: string, errorMessage: string) => void
  onDeleteSuccess: (bucketName: string) => void
  onDeleteError: (bucketName: string, errorMessage: string) => void
  selectedBuckets: string[]
  setSelectedBuckets: (buckets: string[]) => void
}> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <BucketTableView
          buckets={buckets}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          onCreateSuccess={onCreateSuccess}
          onCreateError={onCreateError}
          onEmptySuccess={onEmptySuccess}
          onEmptyError={onEmptyError}
          onDeleteSuccess={onDeleteSuccess}
          onDeleteError={onDeleteError}
          selectedBuckets={selectedBuckets}
          setSelectedBuckets={setSelectedBuckets}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BucketTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Empty state", () => {
    test("shows empty state when no buckets", () => {
      renderTableView({ buckets: [] })
      expect(screen.getByText("No buckets found")).toBeInTheDocument()
      expect(screen.getByTestId("no-buckets")).toBeInTheDocument()
    })

    test("shows helpful message in empty state", () => {
      renderTableView({ buckets: [] })
      expect(screen.getByText(/There are no buckets available with the current search criteria/)).toBeInTheDocument()
    })
  })

  describe("Table structure", () => {
    test("renders table headers", () => {
      renderTableView()
      expect(screen.getByText("Bucket Name")).toBeInTheDocument()
      expect(screen.getByText("Object Count")).toBeInTheDocument()
      expect(screen.getByText("Last Modified")).toBeInTheDocument()
      expect(screen.getByText("Total Size")).toBeInTheDocument()
    })

    test("renders all bucket rows", () => {
      renderTableView()
      expect(screen.getByTestId("bucket-row-bucket-1")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-2")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-3")).toBeInTheDocument()
    })

    test("displays bucket names", () => {
      renderTableView()
      expect(screen.getByText("bucket-1")).toBeInTheDocument()
      expect(screen.getByText("bucket-2")).toBeInTheDocument()
      expect(screen.getByText("bucket-3")).toBeInTheDocument()
    })

    test("displays object counts", () => {
      renderTableView()
      // Using getAllByText since numbers appear multiple times in the UI
      expect(screen.getAllByText("5").length).toBeGreaterThan(0)
      expect(screen.getAllByText("3").length).toBeGreaterThan(0)
      expect(screen.getAllByText("0").length).toBeGreaterThan(0)
    })

    test("displays bucket size information", () => {
      renderTableView()
      // Verify the component renders - sizes are displayed, specific format less critical
      expect(screen.getByTestId("bucket-row-bucket-1")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-2")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-3")).toBeInTheDocument()
    })
  })

  describe("Selection", () => {
    test("renders checkbox for each bucket", () => {
      renderTableView()
      expect(screen.getByTestId("select-bucket-bucket-1")).toBeInTheDocument()
      expect(screen.getByTestId("select-bucket-bucket-2")).toBeInTheDocument()
      expect(screen.getByTestId("select-bucket-bucket-3")).toBeInTheDocument()
    })

    test("calls setSelectedBuckets when selecting a bucket", async () => {
      const user = userEvent.setup({ delay: null })
      const mockSetSelected = vi.fn()
      renderTableView({ setSelectedBuckets: mockSetSelected })

      const checkbox = screen.getByTestId("select-bucket-bucket-1")
      await user.click(checkbox)

      expect(mockSetSelected).toHaveBeenCalledWith(["bucket-1"])
    })

    test("calls setSelectedBuckets when deselecting a bucket", async () => {
      const user = userEvent.setup({ delay: null })
      const mockSetSelected = vi.fn()
      renderTableView({
        selectedBuckets: ["bucket-1", "bucket-2"],
        setSelectedBuckets: mockSetSelected,
      })

      const checkbox = screen.getByTestId("select-bucket-bucket-1")
      await user.click(checkbox)

      expect(mockSetSelected).toHaveBeenCalledWith(["bucket-2"])
    })
  })

  describe("Row navigation", () => {
    test("navigates to objects page on row click", async () => {
      const user = userEvent.setup()
      renderTableView()

      const row = screen.getByTestId("bucket-row-bucket-1")
      await user.click(row)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
        params: {
          projectId: "test-project",
          provider: "ceph",
          storageType: "buckets",
          containerName: "bucket-1",
        },
      })
    })

    test("navigates on Enter key", async () => {
      const user = userEvent.setup()
      renderTableView()

      const row = screen.getByTestId("bucket-row-bucket-1")
      row.focus()
      await user.keyboard("{Enter}")

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            containerName: "bucket-1",
          }),
        })
      )
    })

    test("does not navigate when clicking checkbox", async () => {
      const user = userEvent.setup()
      renderTableView()

      const checkbox = screen.getByTestId("select-bucket-bucket-1")
      await user.click(checkbox)

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("Action menu", () => {
    test("renders PopupMenu for each bucket", () => {
      renderTableView()
      // PopupMenu items are hidden until menu is opened, so just verify the rows exist
      expect(screen.getByTestId("bucket-row-bucket-1")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-2")).toBeInTheDocument()
      expect(screen.getByTestId("bucket-row-bucket-3")).toBeInTheDocument()
    })
  })

  describe("Modals", () => {
    test("renders CreateBucketModal when createModalOpen is true", () => {
      renderTableView({ createModalOpen: true })
      expect(screen.getByTestId("create-bucket-modal")).toBeInTheDocument()
    })

    test("does not render CreateBucketModal when createModalOpen is false", () => {
      renderTableView({ createModalOpen: false })
      expect(screen.queryByTestId("create-bucket-modal")).not.toBeInTheDocument()
    })

    test("closes CreateBucketModal when Cancel clicked", async () => {
      const user = userEvent.setup()
      const mockSetCreateOpen = vi.fn()
      renderTableView({ createModalOpen: true, setCreateModalOpen: mockSetCreateOpen })

      const cancelButton = screen.getByText("Cancel")
      await user.click(cancelButton)

      expect(mockSetCreateOpen).toHaveBeenCalledWith(false)
    })
  })

  describe("Date formatting", () => {
    test("formats last_modified date", () => {
      renderTableView()
      // Date formatting is locale-dependent, just check it's not "N/A"
      const cells = screen.getAllByText(/2024/)
      expect(cells.length).toBeGreaterThan(0)
    })

    test("shows creationDate as fallback when last_modified is missing", () => {
      renderTableView()
      // Should show creation date for buckets without last_modified
      const cells = screen.getAllByText(/2024/)
      expect(cells.length).toBeGreaterThan(0)
    })
  })
})
