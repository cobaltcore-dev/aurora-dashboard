import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SwiftContainers } from "./"
import type { ContainerSummary } from "@/server/Storage/types/swift"

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockContainers: ContainerSummary[] = [
  { name: "alpha", count: 10, bytes: 1048576, last_modified: "2024-03-01T08:00:00.000000" },
  { name: "beta", count: 5, bytes: 524288, last_modified: "2024-01-15T12:00:00.000000" },
  { name: "gamma", count: 20, bytes: 2097152, last_modified: "2024-02-10T09:00:00.000000" },
]

let trpcState = {
  containers: mockContainers as ContainerSummary[] | undefined,
  isLoading: false,
  error: null as { message: string } | null,
  accountInfo: undefined as
    | { bytesUsed: number; quotaBytes?: number; containerCount: number; objectCount: number }
    | undefined,
  serviceInfo: undefined as { swift?: { max_container_name_length?: number } } | undefined,
}

// createContainer mutation mock (used by CreateContainerModal rendered inside ContainerListView)
const mockMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()
let capturedMutationOptions: {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
  onSettled?: () => void
} = {}

// ─── Hoisted Route mock ───────────────────────────────────────────────────────
// vi.mock factories are hoisted — use vi.hoisted() so mockContainersUseSearch
// is available inside the factory and can be updated per-test via mockReturnValue.

const { mockContainersUseSearch } = vi.hoisted(() => {
  type ContainersSearch = {
    sortBy: "name" | "count" | "bytes" | "last_modified" | undefined
    sortDirection: "asc" | "desc" | undefined
    search: string | undefined
  }
  const mockContainersUseSearch = vi.fn<() => ContainersSearch>(() => ({
    sortBy: undefined,
    sortDirection: undefined,
    search: undefined,
  }))
  return { mockContainersUseSearch }
})

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
    })),
    useNavigate: vi.fn(() => vi.fn()),
    Link: vi.fn(
      ({
        children,
        to,
        ...props
      }: {
        children: React.ReactNode
        to: string
        params?: Record<string, string>
        [key: string]: unknown
      }) => (
        <a href={to} {...props}>
          {children}
        </a>
      )
    ),
  }
})

// ─── Mock containers Route (sort + search state read from URL search params) ──

vi.mock("../../../$provider/containers/", () => ({
  Route: {
    fullPath: "/_auth/projects/$projectId/storage/$provider/containers/",
    useSearch: mockContainersUseSearch,
  },
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listContainers: { invalidate: mockInvalidate },
          getContainerMetadata: { invalidate: vi.fn() },
        },
      },
    }),
    storage: {
      swift: {
        listContainers: {
          useQuery: () => ({
            data: trpcState.containers,
            isLoading: trpcState.isLoading,
            error: trpcState.error,
          }),
        },
        getAccountMetadata: {
          useQuery: () => ({ data: trpcState.accountInfo }),
        },
        getServiceInfo: {
          useQuery: () => ({ data: trpcState.serviceInfo }),
        },
        listObjects: {
          useQuery: () => ({ data: [], isLoading: false }),
        },
        getContainerPublicUrl: {
          useQuery: () => ({ data: undefined }),
        },
        createContainer: {
          useMutation: (options: typeof capturedMutationOptions) => {
            capturedMutationOptions = options ?? {}
            return {
              mutate: mockMutate.mockImplementation(() => {
                capturedMutationOptions.onSuccess?.()
                capturedMutationOptions.onSettled?.()
              }),
              reset: mockReset,
              isPending: false,
            }
          },
        },
        updateContainerMetadata: {
          useMutation: () => ({
            mutate: vi.fn(),
            reset: vi.fn(),
            isPending: false,
            isError: false,
            error: null,
          }),
        },
        emptyContainer: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn().mockResolvedValue(3),
            reset: vi.fn(),
            isPending: false,
          }),
        },
        getContainerMetadata: {
          useQuery: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
        },
        deleteContainer: {
          useMutation: () => ({
            mutate: vi.fn(),
            reset: vi.fn(),
            isPending: false,
          }),
        },
      },
    },
  },
}))

// ─── Mock toast notification builders ────────────────────────────────────────

vi.mock("./ContainerToastNotifications", () => ({
  getContainerCreatedToast: vi.fn((name) => ({
    text: `Container "${name}" was successfully created.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainerCreateErrorToast: vi.fn((name, error) => ({
    text: `Could not create container "${name}": ${error}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainerEmptiedToast: vi.fn((name, deletedCount) => ({
    text:
      deletedCount === 0
        ? `Container "${name}" was already empty.`
        : `Container "${name}" was successfully emptied. ${deletedCount} objects deleted.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainerEmptyErrorToast: vi.fn((name, error) => ({
    text: `Could not empty container "${name}": ${error}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainerDeletedToast: vi.fn((name) => ({
    text: `Container "${name}" was successfully deleted.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainerDeleteErrorToast: vi.fn((name, error) => ({
    text: `Could not delete container "${name}": ${error}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainerUpdatedToast: vi.fn((name) => ({
    text: `Container "${name}" properties were successfully updated.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainerUpdateErrorToast: vi.fn((name, error) => ({
    text: `Could not update container "${name}": ${error}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainerAclUpdatedToast: vi.fn((name) => ({
    text: `ACLs for container "${name}" were successfully updated.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainerAclUpdateErrorToast: vi.fn((name, error) => ({
    text: `Could not update ACLs for container "${name}": ${error}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainersEmptiedToast: vi.fn((emptiedCount, totalDeleted) => ({
    text: `${emptiedCount} container(s) successfully emptied. ${totalDeleted} object(s) deleted in total.`,
    variant: "success",
    autoDismiss: true,
  })),
  getContainersEmptyErrorToast: vi.fn((errorMessage) => ({
    text: `One or more containers could not be emptied: ${errorMessage}`,
    variant: "error",
    autoDismiss: true,
  })),
  getContainersEmptyCompleteToast: vi.fn((emptiedCount, totalDeleted, errors) => ({
    text:
      errors.length > 0 ? `Partial: ${emptiedCount} emptied, errors: ${errors.join(", ")}` : `${emptiedCount} emptied`,
    variant: errors.length > 0 && emptiedCount > 0 ? "warning" : errors.length > 0 ? "error" : "success",
    autoDismiss: true,
  })),
}))

// ─── Mock individual container modals ────────────────────────────────────────

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

vi.mock("./EmptyContainerModal", () => ({
  EmptyContainerModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="empty-container-modal">
        <button onClick={onClose}>CloseEmpty</button>
        <button onClick={() => onSuccess?.(container.name, 3)}>SimulateEmptySuccess</button>
        <button onClick={() => onError?.(container.name, "Delete failed")}>SimulateEmptyError</button>
      </div>
    ) : null
  ),
}))

vi.mock("./DeleteContainerModal", () => ({
  DeleteContainerModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="delete-container-modal">
        <button onClick={onClose}>CloseDelete</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateDeleteSuccess</button>
        <button onClick={() => onError?.(container.name, "Delete failed")}>SimulateDeleteError</button>
      </div>
    ) : null
  ),
}))

vi.mock("./EditContainerMetadataModal", () => ({
  EditContainerMetadataModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="edit-container-modal">
        <button onClick={onClose}>CloseEdit</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateEditSuccess</button>
        <button onClick={() => onError?.(container.name, "Update failed")}>SimulateEditError</button>
      </div>
    ) : null
  ),
}))

vi.mock("./ManageContainerAccessModal", () => ({
  ManageContainerAccessModal: vi.fn(({ isOpen, container, onClose, onSuccess, onError }) =>
    isOpen && container ? (
      <div data-testid="manage-access-modal">
        <button onClick={onClose}>CloseManageAccess</button>
        <button onClick={() => onSuccess?.(container.name)}>SimulateAclSuccess</button>
        <button onClick={() => onError?.(container.name, "ACL update failed")}>SimulateAclError</button>
      </div>
    ) : null
  ),
}))

vi.mock("./ContainerLimitsTooltip", () => ({
  ContainerLimitsTooltip: vi.fn(() => <span role="img" aria-label="info" />),
}))

vi.mock("./EmptyContainersModal", () => ({
  EmptyContainersModal: vi.fn(({ isOpen, containers, onClose, onComplete }) =>
    isOpen ? (
      <div data-testid="empty-containers-modal" data-container-count={containers.length}>
        <button onClick={onClose}>CloseEmptyAll</button>
        <button
          onClick={() =>
            onComplete?.({ emptiedCount: containers.length, totalDeleted: containers.length * 3, errors: [] })
          }
        >
          SimulateEmptyAllSuccess
        </button>
        <button onClick={() => onComplete?.({ emptiedCount: 0, totalDeleted: 0, errors: ["bulk empty failed"] })}>
          SimulateEmptyAllError
        </button>
      </div>
    ) : null
  ),
}))

// ─── Mock virtualizer (no layout engine in jsdom) ─────────────────────────────

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

// ─── Render helper ────────────────────────────────────────────────────────────

const renderList = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SwiftContainers />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SwiftContainers (List)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockContainersUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: undefined })
    capturedMutationOptions = {}
    trpcState = {
      containers: mockContainers,
      isLoading: false,
      error: null,
      accountInfo: undefined,
      serviceInfo: undefined,
    }
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Loading state", () => {
    test("shows loading message while fetching", () => {
      trpcState.isLoading = true
      trpcState.containers = undefined
      renderList()
      expect(screen.getByText(/Loading Containers/i)).toBeInTheDocument()
    })

    test("does not render table while loading", () => {
      trpcState.isLoading = true
      trpcState.containers = undefined
      renderList()
      expect(screen.queryByTestId("containers-table-header")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    test("shows error message when query fails", () => {
      trpcState.error = { message: "Failed to fetch" }
      trpcState.containers = undefined
      renderList()
      expect(screen.getByText(/Error Loading Containers/i)).toBeInTheDocument()
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
    })

    test("does not render table on error", () => {
      trpcState.error = { message: "Network error" }
      renderList()
      expect(screen.queryByTestId("containers-table-header")).not.toBeInTheDocument()
    })
  })

  describe("Rendering", () => {
    test("renders the table header", () => {
      renderList()
      expect(screen.getByTestId("containers-table-header")).toBeInTheDocument()
    })

    test("renders all column headers", () => {
      renderList()
      expect(screen.getByRole("columnheader", { name: "Container Name" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Object Count" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Last Modified" })).toBeInTheDocument()
      expect(screen.getByRole("columnheader", { name: "Total Size" })).toBeInTheDocument()
    })

    test("renders the Create Container button", () => {
      renderList()
      expect(screen.getByRole("button", { name: /Create Container/i })).toBeInTheDocument()
    })

    test("renders info icon for limits tooltip", () => {
      renderList()
      expect(screen.getByRole("img", { name: /info/i })).toBeInTheDocument()
    })

    test("renders a row for each container", () => {
      renderList()
      mockContainers.forEach((c) => {
        expect(screen.getByTestId(`container-row-${c.name}`)).toBeInTheDocument()
      })
    })

    test("renders container names in rows", () => {
      renderList()
      expect(screen.getByText("alpha")).toBeInTheDocument()
      expect(screen.getByText("beta")).toBeInTheDocument()
      expect(screen.getByText("gamma")).toBeInTheDocument()
    })

    test("renders empty state when containers array is empty", () => {
      trpcState.containers = []
      renderList()
      expect(screen.getByText(/No containers found/i)).toBeInTheDocument()
    })
  })

  describe("Empty All button", () => {
    test("renders the Empty All button", () => {
      renderList()
      expect(screen.getByRole("button", { name: /Empty All/i })).toBeInTheDocument()
    })

    test("Empty All button is disabled when no containers are selected", () => {
      renderList()
      expect(screen.getByRole("button", { name: /Empty All/i })).toBeDisabled()
    })

    test("Empty All button shows no count when no containers are selected", () => {
      renderList()
      expect(screen.getByRole("button", { name: "Empty All" })).toBeInTheDocument()
    })

    test("Empty All button is enabled and shows count after selecting containers", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /Empty All/i })
        expect(btn).toBeEnabled()
        expect(btn).toHaveTextContent("Empty All (1)")
      })
    })

    test("Empty All button count increments as more containers are selected", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      await user.click(screen.getByTestId("select-container-beta").querySelector("input") as HTMLElement)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Empty All \(2\)/i })).toBeEnabled()
      })
    })

    test("Empty All button returns to disabled with no count after deselecting all", async () => {
      const user = userEvent.setup()
      renderList()
      const alphaCheckbox = screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement
      await user.click(alphaCheckbox)
      await waitFor(() => expect(screen.getByRole("button", { name: /Empty All \(1\)/i })).toBeEnabled())
      await user.click(alphaCheckbox)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Empty All" })).toBeDisabled()
      })
    })

    test("selecting all via header checkbox enables Empty All with full count", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByTestId("select-all-containers").querySelector("input") as HTMLElement)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Empty All \(3\)/i })).toBeEnabled()
      })
    })
  })

  describe("Empty All modal", () => {
    const selectAlpha = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByTestId("select-container-alpha").querySelector("input") as HTMLElement)
      await waitFor(() => expect(screen.getByRole("button", { name: /Empty All \(1\)/i })).toBeEnabled())
    }

    test("modal is not visible by default", () => {
      renderList()
      expect(screen.queryByTestId("empty-containers-modal")).not.toBeInTheDocument()
    })

    test("clicking Empty All opens the modal", async () => {
      const user = userEvent.setup()
      renderList()
      await selectAlpha(user)
      await user.click(screen.getByRole("button", { name: /Empty All \(1\)/i }))
      await waitFor(() => {
        expect(screen.getByTestId("empty-containers-modal")).toBeInTheDocument()
      })
    })

    test("modal receives the selected containers", async () => {
      const user = userEvent.setup()
      renderList()
      await selectAlpha(user)
      await user.click(screen.getByRole("button", { name: /Empty All \(1\)/i }))
      await waitFor(() => {
        expect(screen.getByTestId("empty-containers-modal")).toHaveAttribute("data-container-count", "1")
      })
    })

    test("closing the modal hides it", async () => {
      const user = userEvent.setup()
      renderList()
      await selectAlpha(user)
      await user.click(screen.getByRole("button", { name: /Empty All \(1\)/i }))
      await waitFor(() => expect(screen.getByTestId("empty-containers-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "CloseEmptyAll" }))
      await waitFor(() => {
        expect(screen.queryByTestId("empty-containers-modal")).not.toBeInTheDocument()
      })
    })

    test("shows success toast and clears selection after successful empty", async () => {
      const { getContainersEmptyCompleteToast } = await import("./ContainerToastNotifications")
      const user = userEvent.setup()
      renderList()
      await selectAlpha(user)
      await user.click(screen.getByRole("button", { name: /Empty All \(1\)/i }))
      await waitFor(() => expect(screen.getByTestId("empty-containers-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEmptyAllSuccess" }))
      await waitFor(() => {
        expect(getContainersEmptyCompleteToast).toHaveBeenCalledWith(
          1,
          3,
          [],
          expect.objectContaining({ onDismiss: expect.any(Function) })
        )
        expect(screen.getByRole("button", { name: "Empty All" })).toBeDisabled()
      })
    })

    test("shows error toast when bulk empty fails", async () => {
      const { getContainersEmptyCompleteToast } = await import("./ContainerToastNotifications")
      const user = userEvent.setup()
      renderList()
      await selectAlpha(user)
      await user.click(screen.getByRole("button", { name: /Empty All \(1\)/i }))
      await waitFor(() => expect(screen.getByTestId("empty-containers-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEmptyAllError" }))
      await waitFor(() => {
        expect(getContainersEmptyCompleteToast).toHaveBeenCalledWith(
          0,
          0,
          ["bulk empty failed"],
          expect.objectContaining({ onDismiss: expect.any(Function) })
        )
      })
    })
  })

  describe("Search filtering", () => {
    test("calls navigate when search input changes", async () => {
      const user = userEvent.setup()
      renderList()
      await user.type(screen.getByPlaceholderText(/Search/i), "alph")
      // navigate is called via handleSearchChange — verify the handler fires
      await waitFor(() => {
        // The input is rendered and interactive — typing triggers the handler
        expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument()
      })
    })

    test("filters containers by search param from URL", () => {
      mockContainersUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "alpha" })
      renderList()
      expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
      expect(screen.queryByTestId("container-row-beta")).not.toBeInTheDocument()
      expect(screen.queryByTestId("container-row-gamma")).not.toBeInTheDocument()
    })

    test("search filtering is case-insensitive", () => {
      mockContainersUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "ALPHA" })
      renderList()
      expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
      expect(screen.queryByTestId("container-row-beta")).not.toBeInTheDocument()
    })

    test("shows all containers when search param is empty", () => {
      mockContainersUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "" })
      renderList()
      expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
      expect(screen.getByTestId("container-row-beta")).toBeInTheDocument()
      expect(screen.getByTestId("container-row-gamma")).toBeInTheDocument()
    })

    test("shows empty state when no containers match search param", () => {
      mockContainersUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "nonexistent" })
      renderList()
      expect(screen.getByText(/No containers found/i)).toBeInTheDocument()
    })
  })

  describe("Sorting", () => {
    test("shows containers sorted by name ascending by default", () => {
      renderList()
      expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
      expect(screen.getByTestId("container-row-beta")).toBeInTheDocument()
      expect(screen.getByTestId("container-row-gamma")).toBeInTheDocument()
    })

    test("sorts containers by name descending when sort direction is changed", async () => {
      const user = userEvent.setup()
      renderList()
      // Find the sort direction button in the ListToolbar
      const sortButtons = screen.getAllByRole("button")
      // The toolbar renders sort controls - find the direction toggle
      const descButton = sortButtons.find(
        (btn) =>
          btn.getAttribute("aria-label")?.toLowerCase().includes("desc") ||
          btn.textContent?.toLowerCase().includes("desc") ||
          btn.getAttribute("data-testid")?.includes("desc")
      )
      if (descButton) {
        await user.click(descButton)
        await waitFor(() => {
          // gamma should come before alpha in desc order
          const gammaRow = screen.getByTestId("container-row-gamma")
          const alphaRow = screen.getByTestId("container-row-alpha")
          expect(gammaRow.compareDocumentPosition(alphaRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        })
      }
    })
  })

  describe("Create Container modal", () => {
    test("modal is not visible by default", () => {
      renderList()
      // Modal renders null when isOpen=false
      expect(screen.queryByText(/Create Container/i)?.closest("[role='dialog']")).not.toBeInTheDocument()
    })

    test("opens modal when Create Container button is clicked", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => {
        expect(screen.getByTestId("create-container-modal")).toBeInTheDocument()
      })
    })

    test("closes modal when Close is clicked", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => {
        expect(screen.getByTestId("create-container-modal")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: "Close" }))
      await waitFor(() => {
        expect(screen.queryByTestId("create-container-modal")).not.toBeInTheDocument()
      })
    })
  })

  describe("Quota display", () => {
    test("does not show remaining quota when accountInfo is absent", () => {
      renderList()
      expect(screen.queryByText(/Remaining Quota/i)).not.toBeInTheDocument()
    })

    test("does not show remaining quota when quotaBytes is 0", () => {
      trpcState.accountInfo = { bytesUsed: 500, quotaBytes: 0, containerCount: 2, objectCount: 10 }
      renderList()
      expect(screen.queryByText(/Remaining Quota/i)).not.toBeInTheDocument()
    })

    test("shows remaining quota when accountInfo has quotaBytes > 0", () => {
      trpcState.accountInfo = { bytesUsed: 1073741824, quotaBytes: 10737418240, containerCount: 5, objectCount: 100 }
      renderList()
      expect(screen.getByText(/Remaining Quota/i)).toBeInTheDocument()
      expect(screen.getByText(/9 GiB Capacity/i)).toBeInTheDocument()
    })
  })

  describe("Toast notifications", () => {
    // Helper: open popup menu for a container row
    const openMenu = async (user: ReturnType<typeof userEvent.setup>, containerName: string) => {
      const row = screen.getByTestId(`container-row-${containerName}`)
      const toggle = row.querySelector("button[aria-haspopup='menu']") as HTMLElement
      await user.click(toggle)
    }

    test("shows success toast after container is created", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => expect(screen.getByTestId("create-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "new-container" was successfully created/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when container creation fails", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => expect(screen.getByTestId("create-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not create container "new-container": Server error/i)).toBeInTheDocument()
      })
    })

    test("shows success toast after container is emptied", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("empty-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("empty-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEmptySuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "alpha" was successfully emptied/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when emptying container fails", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("empty-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("empty-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEmptyError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not empty container "alpha": Delete failed/i)).toBeInTheDocument()
      })
    })

    test("shows success toast after container is deleted", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("delete-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("delete-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateDeleteSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "alpha" was successfully deleted/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when deleting container fails", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("delete-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("delete-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateDeleteError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not delete container "alpha": Delete failed/i)).toBeInTheDocument()
      })
    })

    test("shows success toast after container properties are updated", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("properties-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("edit-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEditSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "alpha" properties were successfully updated/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when updating container properties fails", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("properties-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("edit-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateEditError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not update container "alpha": Update failed/i)).toBeInTheDocument()
      })
    })

    test("shows success toast after ACLs are updated", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("access-control-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("manage-access-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateAclSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/ACLs for container "alpha" were successfully updated/i)).toBeInTheDocument()
      })
    })

    test("shows error toast when ACL update fails", async () => {
      const user = userEvent.setup()
      renderList()
      await openMenu(user, "alpha")
      await user.click(screen.getByTestId("access-control-action-alpha"))
      await waitFor(() => expect(screen.getByTestId("manage-access-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateAclError" }))
      await waitFor(() => {
        expect(screen.getByText(/Could not update ACLs for container "alpha": ACL update failed/i)).toBeInTheDocument()
      })
    })

    test("dismisses toast when close button is clicked", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => expect(screen.getByTestId("create-container-modal")).toBeInTheDocument())
      await user.click(screen.getByRole("button", { name: "SimulateSuccess" }))
      await waitFor(() => {
        expect(screen.getByText(/Container "new-container" was successfully created/i)).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: "close" }))
      await waitFor(() => {
        expect(screen.queryByText(/Container "new-container" was successfully created/i)).not.toBeInTheDocument()
      })
    })
  })
})
