import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerListView } from "./ContainerListView"
import type { Container } from "@/server/Storage/types/ceph"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── Mock router ──────────────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ provider: "ceph" }),
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
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

vi.mock("./DeleteBucketModal", () => ({
  DeleteBucketModal: vi.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="delete-bucket-modal">
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}))

// ─── Mock CredentialPrompt ────────────────────────────────────────────────────

vi.mock("./CredentialPrompt", () => ({
  CredentialPrompt: vi.fn(({ onSuccess }) => (
    <div data-testid="credential-prompt">
      <p>No EC2 credentials configured</p>
      <button onClick={onSuccess}>Setup Credentials</button>
    </div>
  )),
}))

// ─── Mock toast notifications ─────────────────────────────────────────────────

vi.mock("./ContainerToastNotifications", () => ({
  getBucketCreatedToast: vi.fn((name) => ({
    variant: "success",
    text: `Bucket ${name} created`,
  })),
  getBucketCreateErrorToast: vi.fn((name, error) => ({
    variant: "error",
    text: `Failed to create bucket ${name}: ${error}`,
  })),
  getBucketDeletedToast: vi.fn((name) => ({
    variant: "success",
    text: `Bucket ${name} deleted`,
  })),
  getBucketDeleteErrorToast: vi.fn((name, error) => ({
    variant: "error",
    text: `Failed to delete bucket ${name}: ${error}`,
  })),
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const { mockRefetch, mockState } = vi.hoisted(() => {
  const mockState = {
    data: null as Container[] | null,
    isLoading: false,
    error: null as { message: string } | null,
  }
  const mockRefetch = vi.fn()
  return { mockRefetch, mockState }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        containers: {
          list: {
            useQuery: () => ({
              data: mockState.data,
              isLoading: mockState.isLoading,
              error: mockState.error,
              refetch: mockRefetch,
            }),
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockContainers: Container[] = [
  {
    name: "bucket-1",
    creationDate: "2024-01-15T10:00:00Z",
    count: 5,
    bytes: 1024,
  },
  {
    name: "bucket-2",
    creationDate: "2024-01-16T10:00:00Z",
    count: 3,
    bytes: 512,
  },
  {
    name: "bucket-3",
    creationDate: "2024-01-17T10:00:00Z",
    count: 0,
    bytes: 0,
  },
]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderListView = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerListView />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ContainerListView", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.data = null
    mockState.isLoading = false
    mockState.error = null
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner while fetching containers", () => {
      mockState.isLoading = true
      renderListView()
      expect(screen.getByText("Loading containers...")).toBeInTheDocument()
    })

    test("renders Spinner component during loading", () => {
      mockState.isLoading = true
      renderListView()
      // Spinner is rendered (checking for the container with Stack)
      expect(screen.getByText("Loading containers...").closest(".juno-stack")).toBeInTheDocument()
    })
  })

  describe("Error handling", () => {
    test("shows CredentialPrompt when NO_CEPH_CREDENTIALS error occurs", () => {
      mockState.error = { message: "NO_CEPH_CREDENTIALS" }
      renderListView()
      expect(screen.getByTestId("credential-prompt")).toBeInTheDocument()
      expect(screen.getByText("No EC2 credentials configured")).toBeInTheDocument()
    })

    test("calls refetch when credential setup succeeds", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.error = { message: "NO_CEPH_CREDENTIALS" }
      renderListView()

      const setupButton = screen.getByText("Setup Credentials")
      await user.click(setupButton)

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    test("shows error message for other errors", () => {
      mockState.error = { message: "Network error" }
      renderListView()
      expect(screen.getByText(/Error Loading Buckets/)).toBeInTheDocument()
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })

    test("does not show CredentialPrompt for non-credential errors", () => {
      mockState.error = { message: "Server error" }
      renderListView()
      expect(screen.queryByTestId("credential-prompt")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    test("shows empty message when no containers exist", () => {
      mockState.data = []
      renderListView()
      expect(screen.getByText("No containers found.")).toBeInTheDocument()
    })

    test("renders table headers even when empty", () => {
      mockState.data = []
      renderListView()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Creation Date")).toBeInTheDocument()
      expect(screen.getByText("Actions")).toBeInTheDocument()
    })

    test("shows Create Bucket button when empty", () => {
      mockState.data = []
      renderListView()
      expect(screen.getByRole("button", { name: /Create Bucket/i })).toBeInTheDocument()
    })
  })

  describe("Container list rendering", () => {
    test("renders all containers", () => {
      mockState.data = mockContainers
      renderListView()
      expect(screen.getByText("bucket-1")).toBeInTheDocument()
      expect(screen.getByText("bucket-2")).toBeInTheDocument()
      expect(screen.getByText("bucket-3")).toBeInTheDocument()
    })

    test("renders table headers", () => {
      mockState.data = mockContainers
      renderListView()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Creation Date")).toBeInTheDocument()
      expect(screen.getByText("Actions")).toBeInTheDocument()
    })

    test("displays creation dates", () => {
      mockState.data = mockContainers
      renderListView()
      // Dates are formatted to locale string, just check they exist
      const dates = screen.getAllByText(/2024/)
      expect(dates.length).toBeGreaterThan(0)
    })

    test("shows Unknown for missing creation date", () => {
      const bucketWithoutDate: Container = {
        name: "bucket-no-date",
        creationDate: "",
        count: 0,
        bytes: 0,
      }
      mockState.data = [bucketWithoutDate]
      renderListView()
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })

    test("renders delete button for each container", () => {
      mockState.data = mockContainers
      renderListView()
      const deleteButtons = screen.getAllByTitle("Delete bucket")
      // Should have at least 3 delete buttons (one per container)
      expect(deleteButtons.length).toBeGreaterThanOrEqual(3)
    })

    test("container names are links", () => {
      mockState.data = mockContainers
      renderListView()
      const link = screen.getByText("bucket-1").closest("a")
      expect(link).toBeInTheDocument()
    })
  })

  describe("Create Bucket action", () => {
    test("renders Create Bucket button", () => {
      mockState.data = mockContainers
      renderListView()
      expect(screen.getByRole("button", { name: /Create Bucket/i })).toBeInTheDocument()
    })

    test("opens CreateBucketModal when Create Bucket clicked", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.data = mockContainers
      renderListView()

      const createButton = screen.getByRole("button", { name: /Create Bucket/i })
      await user.click(createButton)

      expect(screen.getByTestId("create-bucket-modal")).toBeInTheDocument()
    })

    test("closes CreateBucketModal when Cancel clicked", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.data = mockContainers
      renderListView()

      const createButton = screen.getByRole("button", { name: /Create Bucket/i })
      await user.click(createButton)

      const cancelButton = screen.getByText("Cancel")
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId("create-bucket-modal")).not.toBeInTheDocument()
      })
    })
  })

  describe("Delete Bucket action", () => {
    test("opens DeleteBucketModal when delete button clicked", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.data = mockContainers
      renderListView()

      const deleteButtons = screen.getAllByTitle("Delete bucket")
      await user.click(deleteButtons[0])

      expect(screen.getByTestId("delete-bucket-modal")).toBeInTheDocument()
    })

    test("closes DeleteBucketModal when Cancel clicked", async () => {
      const user = userEvent.setup({ delay: null })
      mockState.data = mockContainers
      renderListView()

      const deleteButtons = screen.getAllByTitle("Delete bucket")
      await user.click(deleteButtons[0])

      const cancelButton = screen.getByText("Cancel")
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId("delete-bucket-modal")).not.toBeInTheDocument()
      })
    })
  })

  describe("Toast notifications", () => {
    test("does not show toast initially", () => {
      mockState.data = mockContainers
      renderListView()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
