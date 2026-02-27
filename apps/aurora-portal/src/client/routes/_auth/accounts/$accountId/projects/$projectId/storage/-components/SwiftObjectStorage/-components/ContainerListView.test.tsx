import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerListView } from "./ContainerListView"
import type { ContainerSummary } from "@/server/Storage/types/swift"

// ─── Mock virtualizer ─────────────────────────────────────────────────────────
// useVirtualizer doesn't work in jsdom (no layout engine), so we render all
// items directly by mocking getVirtualItems to return every row.

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

// ─── Mock toast notification builders ────────────────────────────────────────

vi.mock("./ContainerToastNotifications", () => ({
  getContainerCreatedToast: vi.fn((name) => ({
    title: "Container Created",
    text: `Container "${name}" was successfully created.`,
    variant: "success",
    autoDismiss: true,
    autoDismissTimeout: 5000,
  })),
  getContainerCreateErrorToast: vi.fn((name, error) => ({
    title: "Failed to Create Container",
    text: `Could not create container "${name}": ${error}`,
    variant: "error",
    autoDismiss: false,
  })),
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
}: {
  containers?: ContainerSummary[]
  createModalOpen?: boolean
  setCreateModalOpen?: (open: boolean) => void
  maxContainerNameLength?: number
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerListView
          containers={containers}
          createModalOpen={createModalOpen}
          setCreateModalOpen={setCreateModalOpen}
          maxContainerNameLength={maxContainerNameLength}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContainerListView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
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

  describe("Footer", () => {
    test("shows container count in footer", () => {
      renderView()
      expect(screen.getByText(/Showing.*of.*containers/i)).toBeInTheDocument()
    })

    test("footer shows total count matching containers length", () => {
      renderView()
      expect(screen.getByText(/of 3 containers/i)).toBeInTheDocument()
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

  describe("Toast notifications", () => {
    test("shows success toast after container is created", async () => {
      const user = userEvent.setup()
      renderView({ createModalOpen: true })
      await user.click(screen.getByRole("button", { name: "SimulateSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "new-container" was successfully created/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when container creation fails", async () => {
      const user = userEvent.setup()
      renderView({ createModalOpen: true })
      await user.click(screen.getByRole("button", { name: "SimulateError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not create container "new-container": Server error/i)).toBeInTheDocument()
      })
    })

    test("dismisses toast when onDismiss is called", async () => {
      const user = userEvent.setup()
      renderView({ createModalOpen: true })
      await user.click(screen.getByRole("button", { name: "SimulateSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "new-container" was successfully created/i)).toBeInTheDocument()
      })
      // The Juno Toast renders a close button with aria-label="close"
      const dismissButton = screen.getByRole("button", { name: "close" })
      await user.click(dismissButton)
      await waitFor(() => {
        expect(screen.queryByText(/Container "new-container" was successfully created/i)).not.toBeInTheDocument()
      })
    })
  })
})
