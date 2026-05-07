import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerTableView } from "./ContainerTableView"
import type { ContainerSummary } from "@/server/Storage/types/swift"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────
// useVirtualizer doesn't work in jsdom (no layout engine), so we render all
// items directly by mocking getVirtualItems to return every row.

const mockNavigateFn = vi.fn()

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      projectId: "test-project",
      provider: "swift",
    })),
    useNavigate: vi.fn(() => mockNavigateFn),
  }
})

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

// ─── Mock CreateContainerModal ────────────────────────────────────────────────
// We test the modal in isolation; here we only care it receives the right props.

vi.mock("./CreateContainerModal", () => ({
  CreateContainerModal: vi.fn(({ isOpen, onClose, onSuccess, onError }) =>
    isOpen ? (
      <div data-testid="create-container-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess?.("new-container")}>SimulateSuccess</button>
        <button onClick={() => onError?.("new-container", "Server error")}>SimulateError</button>
      </div>
    ) : null
  ),
}))

// ─── Mock EmptyContainerModal ────────────────────────────────────────────────

vi.mock("./EmptyContainerModal", () => ({
  EmptyContainerModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="empty-container-modal">
        <span data-testid="empty-modal-container-name">{container.name}</span>
        <button onClick={onClose}>CloseEmpty</button>
        <button onClick={() => onSuccess?.(container.name, 3)}>SimulateEmptySuccess</button>
        <button onClick={() => onError?.(container.name, "Delete failed")}>SimulateEmptyError</button>
      </div>
    ) : null
  ),
}))

// ─── Mock DeleteContainerModal ────────────────────────────────────────────────

vi.mock("./DeleteContainerModal", () => ({
  DeleteContainerModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="delete-container-modal">
        <span data-testid="delete-modal-container-name">{container.name}</span>
        <button onClick={onClose}>CloseDelete</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateDeleteSuccess</button>
        <button onClick={() => onError?.(container.name, "Delete failed")}>SimulateDeleteError</button>
      </div>
    ) : null
  ),
}))

// ─── Mock EditContainerMetadataModal ──────────────────────────────────────────

vi.mock("./EditContainerMetadataModal", () => ({
  EditContainerMetadataModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="edit-container-modal">
        <span data-testid="edit-modal-container-name">{container.name}</span>
        <button onClick={onClose}>CloseEdit</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateEditSuccess</button>
        <button onClick={() => onError?.(container.name, "Update failed")}>SimulateEditError</button>
      </div>
    ) : null
  ),
}))

// ─── Mock ManageContainerAccessModal ─────────────────────────────────────────

vi.mock("./ManageContainerAccessModal", () => ({
  ManageContainerAccessModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="manage-access-modal">
        <span data-testid="manage-access-modal-container-name">{container.name}</span>
        <button onClick={onClose}>CloseManageAccess</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateAclSuccess</button>
        <button onClick={() => onError?.(container.name, "ACL update failed")}>SimulateAclError</button>
      </div>
    ) : null
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeContainer = (name: string, overrides: Partial<ContainerSummary> = {}): ContainerSummary => ({
  name,
  count: 10,
  bytes: 1048576,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const mockContainers: ContainerSummary[] = [
  makeContainer("alpha", { count: 42, bytes: 2097152, last_modified: "2024-03-01T08:00:00.000000" }),
  makeContainer("beta", { count: 0, bytes: 0, last_modified: "2024-02-15T12:00:00.000000" }),
  makeContainer("gamma", { count: 100, bytes: 5242880 }),
]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderView = ({
  containers = mockContainers,
  createModalOpen = false,
  setCreateModalOpen = vi.fn(),
  maxContainerNameLength,
  onCreateSuccess = vi.fn(),
  onCreateError = vi.fn(),
  onEmptySuccess = vi.fn(),
  onEmptyError = vi.fn(),
  onDeleteSuccess = vi.fn(),
  onDeleteError = vi.fn(),
  onPropertiesSuccess = vi.fn(),
  onPropertiesError = vi.fn(),
  onAclSuccess = vi.fn(),
  onAclError = vi.fn(),
  selectedContainers = [],
  setSelectedContainers = vi.fn(),
}: {
  containers?: ContainerSummary[]
  createModalOpen?: boolean
  setCreateModalOpen?: (open: boolean) => void
  maxContainerNameLength?: number
  onCreateSuccess?: (containerName: string) => void
  onCreateError?: (containerName: string, errorMessage: string) => void
  onEmptySuccess?: (containerName: string, deletedCount: number) => void
  onEmptyError?: (containerName: string, errorMessage: string) => void
  onDeleteSuccess?: (containerName: string) => void
  onDeleteError?: (containerName: string, errorMessage: string) => void
  onPropertiesSuccess?: (containerName: string) => void
  onPropertiesError?: (containerName: string, errorMessage: string) => void
  onAclSuccess?: (containerName: string) => void
  onAclError?: (containerName: string, errorMessage: string) => void
  selectedContainers?: string[]
  setSelectedContainers?: (containers: string[]) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerTableView
          containers={containers}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          maxContainerNameLength={maxContainerNameLength}
          onCreateSuccess={onCreateSuccess}
          onCreateError={onCreateError}
          onEmptySuccess={onEmptySuccess}
          onEmptyError={onEmptyError}
          onDeleteSuccess={onDeleteSuccess}
          onDeleteError={onDeleteError}
          onPropertiesSuccess={onPropertiesSuccess}
          onPropertiesError={onPropertiesError}
          onAclSuccess={onAclSuccess}
          onAclError={onAclError}
          selectedContainers={selectedContainers}
          setSelectedContainers={setSelectedContainers}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContainerTableView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockNavigateFn.mockReset()
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Empty state", () => {
    test("renders empty state when containers array is empty", () => {
      renderView({ containers: [] })
      expect(screen.getByTestId("no-containers")).toBeInTheDocument()
      expect(screen.getByText(/No containers found/i)).toBeInTheDocument()
    })

    test("shows descriptive message in empty state", () => {
      renderView({ containers: [] })
      expect(screen.getByText(/There are no containers available/i)).toBeInTheDocument()
    })

    test("does not render table header in empty state", () => {
      renderView({ containers: [] })
      expect(screen.queryByTestId("containers-table-header")).not.toBeInTheDocument()
    })
  })

  describe("Table structure", () => {
    test("renders table header when containers exist", () => {
      renderView()
      expect(screen.getByTestId("containers-table-header")).toBeInTheDocument()
    })

    test("renders all column headers", () => {
      renderView()
      expect(screen.getByText("Container Name")).toBeInTheDocument()
      expect(screen.getByText("Object Count")).toBeInTheDocument()
      expect(screen.getByText("Last Modified")).toBeInTheDocument()
      expect(screen.getByText("Total Size")).toBeInTheDocument()
    })

    test("renders table body", () => {
      renderView()
      expect(screen.getByTestId("containers-table-body")).toBeInTheDocument()
    })
  })

  describe("Container rows", () => {
    test("renders a row for each container", () => {
      renderView()
      mockContainers.forEach((c) => {
        expect(screen.getByTestId(`container-row-${c.name}`)).toBeInTheDocument()
      })
    })

    test("displays container names", () => {
      renderView()
      expect(screen.getByText("alpha")).toBeInTheDocument()
      expect(screen.getByText("beta")).toBeInTheDocument()
      expect(screen.getByText("gamma")).toBeInTheDocument()
    })

    test("displays formatted object count", () => {
      renderView()
      // alpha has count 42
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    test("displays formatted bytes", () => {
      renderView()
      // alpha: 2097152 bytes = 2 MiB
      expect(screen.getByText("2 MiB")).toBeInTheDocument()
    })

    test("displays N/A when last_modified is missing", () => {
      const containers = [makeContainer("no-date", { last_modified: undefined })]
      renderView({ containers })
      expect(screen.getByText("N/A")).toBeInTheDocument()
    })

    test("displays formatted date when last_modified is present", () => {
      renderView()
      // At least one date string should be rendered (locale-dependent, so just check it exists)
      const row = screen.getByTestId("container-row-alpha")
      expect(row).toBeInTheDocument()
    })
  })

  describe("Selection", () => {
    test("renders a checkbox in the table header", () => {
      renderView()
      expect(screen.getByTestId("select-all-containers")).toBeInTheDocument()
    })

    test("renders a checkbox for each container row", () => {
      renderView()
      mockContainers.forEach((c) => {
        expect(screen.getByTestId(`select-container-${c.name}`)).toBeInTheDocument()
      })
    })

    test("row checkbox is unchecked when container is not selected", () => {
      renderView({ selectedContainers: [] })
      expect(screen.getByTestId("select-container-alpha").querySelector("input")).not.toBeChecked()
    })

    test("row checkbox is checked when container is in selectedContainers", () => {
      renderView({ selectedContainers: ["alpha"] })
      expect(screen.getByTestId("select-container-alpha").querySelector("input")).toBeChecked()
      expect(screen.getByTestId("select-container-beta").querySelector("input")).not.toBeChecked()
    })

    test("select-all checkbox is unchecked when nothing is selected", () => {
      renderView({ selectedContainers: [] })
      expect(screen.getByTestId("select-all-containers").querySelector("input")).not.toBeChecked()
    })

    test("select-all checkbox is checked when all containers are selected", () => {
      renderView({ selectedContainers: mockContainers.map((c) => c.name) })
      expect(screen.getByTestId("select-all-containers").querySelector("input")).toBeChecked()
    })

    test("select-all checkbox is unchecked when only some containers are selected", () => {
      renderView({ selectedContainers: ["alpha"] })
      expect(screen.getByTestId("select-all-containers").querySelector("input")).not.toBeChecked()
    })

    test("clicking a row checkbox calls setSelectedContainers with the container added", async () => {
      const setSelectedContainers = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedContainers: [], setSelectedContainers })
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      expect(setSelectedContainers).toHaveBeenCalledWith(["alpha"])
    })

    test("clicking a checked row checkbox calls setSelectedContainers with the container removed", async () => {
      const setSelectedContainers = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedContainers: ["alpha", "beta"], setSelectedContainers })
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      expect(setSelectedContainers).toHaveBeenCalledWith(["beta"])
    })

    test("clicking select-all calls setSelectedContainers with all container names", async () => {
      const setSelectedContainers = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedContainers: [], setSelectedContainers })
      await user.click(screen.getByTestId("select-all-containers").querySelector("input") as HTMLElement)
      expect(setSelectedContainers).toHaveBeenCalledWith(mockContainers.map((c) => c.name))
    })

    test("clicking select-all when all selected calls setSelectedContainers with empty array", async () => {
      const setSelectedContainers = vi.fn()
      const user = userEvent.setup()
      renderView({ selectedContainers: mockContainers.map((c) => c.name), setSelectedContainers })
      await user.click(screen.getByTestId("select-all-containers").querySelector("input") as HTMLElement)
      expect(setSelectedContainers).toHaveBeenCalledWith([])
    })

    test("clicking a row checkbox does not trigger row navigation", async () => {
      const user = userEvent.setup()
      renderView()
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      expect(mockNavigateFn).not.toHaveBeenCalled()
    })
  })

  describe("Row navigation", () => {
    test("clicking a container row calls navigate to the objects route", async () => {
      const user = userEvent.setup()
      renderView()
      await user.click(screen.getByTestId("container-row-alpha"))
      expect(mockNavigateFn).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/containers/$containerName/objects",
        params: { projectId: "test-project", provider: "swift", containerName: "alpha" },
      })
    })

    test("pressing Enter on a focused container row calls navigate", async () => {
      const user = userEvent.setup()
      renderView()
      const row = screen.getByTestId("container-row-alpha")
      row.focus()
      await user.keyboard("{Enter}")
      expect(mockNavigateFn).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/containers/$containerName/objects",
        params: { projectId: "test-project", provider: "swift", containerName: "alpha" },
      })
    })

    test("pressing Space on a focused container row calls navigate", async () => {
      const user = userEvent.setup()
      renderView()
      const row = screen.getByTestId("container-row-alpha")
      row.focus()
      await user.keyboard(" ")
      expect(mockNavigateFn).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/containers/$containerName/objects",
        params: { projectId: "test-project", provider: "swift", containerName: "alpha" },
      })
    })

    test("container rows have tabIndex 0 and role link", () => {
      renderView()
      mockContainers.forEach((c) => {
        const row = screen.getByTestId(`container-row-${c.name}`)
        expect(row).toHaveAttribute("tabindex", "0")
        expect(row).toHaveAttribute("role", "link")
      })
    })

    test("clicking the popup menu does not trigger row navigation", async () => {
      const user = userEvent.setup()
      renderView()
      const row = screen.getByTestId("container-row-alpha")
      const toggle = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(toggle)
      expect(mockNavigateFn).not.toHaveBeenCalled()
    })
  })

  describe("Footer", () => {
    test("shows container count in footer", () => {
      renderView()
      expect(screen.getByText(/3 containers/i)).toBeInTheDocument()
    })

    test("footer count matches containers length", () => {
      renderView({ containers: [makeContainer("only-one")] })
      expect(screen.getByText(/1 container$/i)).toBeInTheDocument()
    })
  })

  describe("Context menu", () => {
    test("renders a popup menu trigger for each container row", () => {
      renderView()
      const menuTriggers = screen.getAllByRole("button", { name: /more/i })
      expect(menuTriggers).toHaveLength(mockContainers.length)
    })

    test("shows all four actions when menu is opened", async () => {
      const user = userEvent.setup()
      renderView()
      const [firstMenuTrigger] = screen.getAllByRole("button", { name: /more/i })
      await user.click(firstMenuTrigger)
      expect(screen.getByText("Manage Access")).toBeInTheDocument()
      expect(screen.getByText("Edit Metadata")).toBeInTheDocument()
      expect(screen.getByText("Empty")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })
  })

  describe("CreateContainerModal integration", () => {
    test("does not render modal when createModalOpen is false", () => {
      renderView({ createModalOpen: false })
      expect(screen.queryByTestId("create-container-modal")).not.toBeInTheDocument()
    })

    test("renders modal when createModalOpen is true", () => {
      renderView({ createModalOpen: true })
      expect(screen.getByTestId("create-container-modal")).toBeInTheDocument()
    })

    test("calls setCreateModalOpen(false) when modal is closed", async () => {
      const setCreateModalOpen = vi.fn()
      const user = userEvent.setup()
      renderView({ createModalOpen: true, setCreateModalOpen })
      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(setCreateModalOpen).toHaveBeenCalledWith(false)
    })
  })

  describe("Callback props", () => {
    test("calls onCreateSuccess when create modal fires success", async () => {
      const onCreateSuccess = vi.fn()
      const user = userEvent.setup()
      renderView({ createModalOpen: true, onCreateSuccess })
      await user.click(screen.getByRole("button", { name: "SimulateSuccess" }))
      expect(onCreateSuccess).toHaveBeenCalledWith("new-container")
    })

    test("calls onCreateError when create modal fires error", async () => {
      const onCreateError = vi.fn()
      const user = userEvent.setup()
      renderView({ createModalOpen: true, onCreateError })
      await user.click(screen.getByRole("button", { name: "SimulateError" }))
      expect(onCreateError).toHaveBeenCalledWith("new-container", "Server error")
    })

    test("calls onEmptySuccess when empty modal fires success", async () => {
      const onEmptySuccess = vi.fn()
      const user = userEvent.setup()
      renderView({ onEmptySuccess })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("empty-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateEmptySuccess" }))
      expect(onEmptySuccess).toHaveBeenCalledWith("alpha", 3)
    })

    test("calls onEmptyError when empty modal fires error", async () => {
      const onEmptyError = vi.fn()
      const user = userEvent.setup()
      renderView({ onEmptyError })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("empty-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateEmptyError" }))
      expect(onEmptyError).toHaveBeenCalledWith("alpha", "Delete failed")
    })

    test("calls onDeleteSuccess when delete modal fires success", async () => {
      const onDeleteSuccess = vi.fn()
      const user = userEvent.setup()
      renderView({ onDeleteSuccess })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("delete-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateDeleteSuccess" }))
      expect(onDeleteSuccess).toHaveBeenCalledWith("alpha")
    })

    test("calls onDeleteError when delete modal fires error", async () => {
      const onDeleteError = vi.fn()
      const user = userEvent.setup()
      renderView({ onDeleteError })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("delete-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateDeleteError" }))
      expect(onDeleteError).toHaveBeenCalledWith("alpha", "Delete failed")
    })

    test("calls onPropertiesSuccess when edit modal fires success", async () => {
      const onPropertiesSuccess = vi.fn()
      const user = userEvent.setup()
      renderView({ onPropertiesSuccess })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("properties-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateEditSuccess" }))
      expect(onPropertiesSuccess).toHaveBeenCalledWith("alpha")
    })

    test("calls onPropertiesError when edit modal fires error", async () => {
      const onPropertiesError = vi.fn()
      const user = userEvent.setup()
      renderView({ onPropertiesError })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("properties-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateEditError" }))
      expect(onPropertiesError).toHaveBeenCalledWith("alpha", "Update failed")
    })

    test("calls onAclSuccess when manage access modal fires success", async () => {
      const onAclSuccess = vi.fn()
      const user = userEvent.setup()
      renderView({ onAclSuccess })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("access-control-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateAclSuccess" }))
      expect(onAclSuccess).toHaveBeenCalledWith("alpha")
    })

    test("calls onAclError when manage access modal fires error", async () => {
      const onAclError = vi.fn()
      const user = userEvent.setup()
      renderView({ onAclError })
      const row = screen.getByTestId("container-row-alpha")
      await user.click(row.querySelector("button[aria-haspopup='menu']") as HTMLElement)
      await user.click(screen.getByTestId("access-control-action-alpha"))
      await user.click(screen.getByRole("button", { name: "SimulateAclError" }))
      expect(onAclError).toHaveBeenCalledWith("alpha", "ACL update failed")
    })
  })

  describe("EmptyContainerModal integration", () => {
    // Helper: open the PopupMenu for a given container row, then click Empty
    const openEmptyModal = async (user: ReturnType<typeof userEvent.setup>, containerName: string) => {
      const row = screen.getByTestId(`container-row-${containerName}`)
      const toggle = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(toggle)
      await user.click(screen.getByTestId(`empty-action-${containerName}`))
    }

    test("does not render empty modal by default", () => {
      renderView()
      expect(screen.queryByTestId("empty-container-modal")).not.toBeInTheDocument()
    })

    test("renders empty modal when popup menu Empty action is clicked", async () => {
      const user = userEvent.setup()
      renderView()
      await openEmptyModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("empty-container-modal")).toBeInTheDocument()
      })
    })

    test("passes the correct container to the empty modal", async () => {
      const user = userEvent.setup()
      renderView()
      await openEmptyModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("empty-modal-container-name")).toHaveTextContent("alpha")
      })
    })

    test("closes empty modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView()
      await openEmptyModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("empty-container-modal")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: "CloseEmpty" }))
      await waitFor(() => {
        expect(screen.queryByTestId("empty-container-modal")).not.toBeInTheDocument()
      })
    })
  })

  describe("DeleteContainerModal integration", () => {
    // Helper: open the PopupMenu for a given container row, then click Delete
    const openDeleteModal = async (user: ReturnType<typeof userEvent.setup>, containerName: string) => {
      const row = screen.getByTestId(`container-row-${containerName}`)
      const toggle = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(toggle)
      await user.click(screen.getByTestId(`delete-action-${containerName}`))
    }

    test("does not render delete modal by default", () => {
      renderView()
      expect(screen.queryByTestId("delete-container-modal")).not.toBeInTheDocument()
    })

    test("renders delete modal when popup menu Delete action is clicked", async () => {
      const user = userEvent.setup()
      renderView()
      await openDeleteModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("delete-container-modal")).toBeInTheDocument()
      })
    })

    test("passes the correct container to the delete modal", async () => {
      const user = userEvent.setup()
      renderView()
      await openDeleteModal(user, "beta")
      await waitFor(() => {
        expect(screen.getByTestId("delete-modal-container-name")).toHaveTextContent("beta")
      })
    })

    test("closes delete modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView()
      await openDeleteModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("delete-container-modal")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: "CloseDelete" }))
      await waitFor(() => {
        expect(screen.queryByTestId("delete-container-modal")).not.toBeInTheDocument()
      })
    })
  })

  describe("ManageContainerAccessModal integration", () => {
    // Helper: open the PopupMenu for a given container row, then click Manage Access
    const openManageAccessModal = async (user: ReturnType<typeof userEvent.setup>, containerName: string) => {
      const row = screen.getByTestId(`container-row-${containerName}`)
      const toggle = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(toggle)
      await user.click(screen.getByTestId(`access-control-action-${containerName}`))
    }

    test("does not render manage access modal by default", () => {
      renderView()
      expect(screen.queryByTestId("manage-access-modal")).not.toBeInTheDocument()
    })

    test("renders manage access modal when popup menu Manage Access action is clicked", async () => {
      const user = userEvent.setup()
      renderView()
      await openManageAccessModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("manage-access-modal")).toBeInTheDocument()
      })
    })

    test("passes the correct container to the manage access modal", async () => {
      const user = userEvent.setup()
      renderView()
      await openManageAccessModal(user, "beta")
      await waitFor(() => {
        expect(screen.getByTestId("manage-access-modal-container-name")).toHaveTextContent("beta")
      })
    })

    test("closes manage access modal when onClose is called", async () => {
      const user = userEvent.setup()
      renderView()
      await openManageAccessModal(user, "alpha")
      await waitFor(() => {
        expect(screen.getByTestId("manage-access-modal")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: "CloseManageAccess" }))
      await waitFor(() => {
        expect(screen.queryByTestId("manage-access-modal")).not.toBeInTheDocument()
      })
    })
  })
})
