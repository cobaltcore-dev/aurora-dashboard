import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CephContainers } from "./"
import type { Container } from "@/server/Storage/types/ceph"

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const { mockNavigate, mockUseSearch, resetSearch } = vi.hoisted(() => {
  let currentSearch: Record<string, string | undefined> = {
    sortBy: undefined,
    sortDirection: undefined,
    search: undefined,
  }

  const mockUseSearch = vi.fn(() => currentSearch)

  const mockNavigate = vi.fn(({ search }: { search?: (prev: typeof currentSearch) => typeof currentSearch }) => {
    if (typeof search === "function") {
      currentSearch = search(currentSearch)
      mockUseSearch.mockReturnValue(currentSearch)
    }
  })

  return {
    mockNavigate,
    mockUseSearch,
    resetSearch: () => {
      currentSearch = { sortBy: undefined, sortDirection: undefined, search: undefined }
      mockUseSearch.mockReturnValue(currentSearch)
    },
  }
})

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  }
})

// ─── Mock Route (search params + fullPath) ────────────────────────────────────

vi.mock("@/client/routes/_auth/projects/$projectId/storage/$provider/containers", () => ({
  Route: {
    fullPath: "/_auth/projects/$projectId/storage/$provider/containers/",
    useSearch: mockUseSearch,
  },
}))

// ─── Mock child components ────────────────────────────────────────────────────
// We test index.tsx in isolation — child components are tested separately.

let capturedSetSelectedContainers: ((containers: string[]) => void) | undefined

vi.mock("./ContainerTableView", () => ({
  ContainerTableView: vi.fn(({ containers, createModalOpen, selectedContainers, setSelectedContainers }) => {
    capturedSetSelectedContainers = setSelectedContainers
    return (
      <div
        data-testid="container-table-view"
        data-bucket-count={containers.length}
        data-create-modal-open={String(createModalOpen)}
        data-selected-count={selectedContainers?.length ?? 0}
      >
        <button data-testid="simulate-select-bucket" onClick={() => setSelectedContainers?.(["bucket-1"])}>
          SimulateSelectOne
        </button>
        <button data-testid="simulate-select-two" onClick={() => setSelectedContainers?.(["bucket-1", "bucket-2"])}>
          SimulateSelectTwo
        </button>
        <button data-testid="simulate-deselect-all" onClick={() => setSelectedContainers?.([])}>
          SimulateDeselectAll
        </button>
      </div>
    )
  }),
}))

vi.mock("./EmptyBucketsModal", () => ({
  EmptyBucketsModal: vi.fn(({ isOpen, buckets, onClose, onComplete }) => {
    return isOpen ? (
      <div data-testid="empty-buckets-modal" data-bucket-count={buckets?.length ?? 0}>
        <button onClick={onClose}>CloseEmptyAll</button>
        <button
          data-testid="simulate-empty-success"
          onClick={() => onComplete?.({ emptiedCount: buckets?.length ?? 0, totalDeleted: 8, errors: [] })}
        >
          SimulateEmptySuccess
        </button>
        <button
          data-testid="simulate-empty-error"
          onClick={() =>
            onComplete?.({
              emptiedCount: 0,
              totalDeleted: 0,
              errors: ["bucket-1: Empty failed"],
            })
          }
        >
          SimulateEmptyError
        </button>
      </div>
    ) : null
  }),
}))

// ─── Mock toast notifications ─────────────────────────────────────────────────

vi.mock("./ContainerToastNotifications", () => ({
  getBucketCreatedToast: vi.fn(() => ({ variant: "success", children: null })),
  getBucketCreateErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getBucketEmptiedToast: vi.fn(() => ({ variant: "success", children: null })),
  getBucketEmptyErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getBucketDeletedToast: vi.fn(() => ({ variant: "success", children: null })),
  getBucketDeleteErrorToast: vi.fn(() => ({ variant: "error", children: null })),
  getBucketsEmptyCompleteToast: vi.fn(() => ({ variant: "success", children: null })),
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockBuckets: Container[] = [
  { name: "bucket-1", creationDate: "2024-01-15T10:00:00Z", count: 5, bytes: 1024 },
  { name: "bucket-2", creationDate: "2024-01-16T10:00:00Z", count: 3, bytes: 512 },
  { name: "bucket-3", creationDate: "2024-01-17T10:00:00Z", count: 0, bytes: 0 },
]

let trpcState = {
  buckets: mockBuckets as Container[] | undefined,
  isLoading: false,
  error: null as { message: string } | null,
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        containers: {
          list: {
            useQuery: () => ({
              data: trpcState.buckets,
              isLoading: trpcState.isLoading,
              error: trpcState.error,
            }),
          },
        },
      },
    },
  },
}))

// ─── Mock useProjectId ────────────────────────────────────────────────────────

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-123",
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderContainers = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CephContainers />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CephContainers (index)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetSearch()
    trpcState = { buckets: mockBuckets, isLoading: false, error: null }
    capturedSetSelectedContainers = undefined
    await act(async () => {
      i18n.activate("en")
    })
  })

  // The bulk-empty flow now lives in the Zone 3 "Actions" popup: select rows,
  // open the (otherwise disabled) Actions menu, then click the singular/plural
  // "Empty Bucket(s)" item to open the modal.
  const actionsButton = () => screen.getByRole("button", { name: /Actions/i })

  const selectOne = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByTestId("simulate-select-bucket"))
    await waitFor(() => expect(actionsButton()).toBeEnabled())
  }

  const selectTwo = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByTestId("simulate-select-two"))
    await waitFor(() => expect(actionsButton()).toBeEnabled())
  }

  const openEmptyModal = async (user: ReturnType<typeof userEvent.setup>, label: "Empty Bucket" | "Empty Buckets") => {
    await user.click(actionsButton())
    await user.click(await screen.findByText(label))
    await waitFor(() => expect(screen.getByTestId("empty-buckets-modal")).toBeInTheDocument())
  }

  describe("Loading state", () => {
    test("shows loading spinner while fetching", () => {
      trpcState.isLoading = true
      trpcState.buckets = undefined
      renderContainers()
      expect(screen.getByText(/Loading Buckets/i)).toBeInTheDocument()
    })

    test("does not render table view while loading", () => {
      trpcState.isLoading = true
      trpcState.buckets = undefined
      renderContainers()
      expect(screen.queryByTestId("container-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    test("shows error message when query fails", () => {
      trpcState.error = { message: "Network error" }
      trpcState.buckets = undefined
      renderContainers()
      expect(screen.getByText(/Failed to load containers/i)).toBeInTheDocument()
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    test("does not render table view on error", () => {
      trpcState.error = { message: "Network error" }
      renderContainers()
      expect(screen.queryByTestId("container-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Rendering", () => {
    test("renders ContainerTableView", () => {
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toBeInTheDocument()
    })

    test("passes correct bucket count to ContainerTableView", () => {
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-bucket-count", "3")
    })

    test("renders Create Bucket button", () => {
      renderContainers()
      expect(screen.getByRole("button", { name: /Create Bucket/i })).toBeInTheDocument()
    })

    test("renders the Actions button", () => {
      renderContainers()
      expect(screen.getByRole("button", { name: /Actions/i })).toBeInTheDocument()
    })

    test("Actions button is disabled when no containers are selected", () => {
      renderContainers()
      expect(screen.getByRole("button", { name: /Actions/i })).toBeDisabled()
    })

    test("passes selectedContainers and setSelectedContainers to ContainerTableView", () => {
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-selected-count", "0")
      expect(typeof capturedSetSelectedContainers).toBe("function")
    })
  })

  describe("Info block", () => {
    test("renders containers-info-block", () => {
      renderContainers()
      expect(screen.getByTestId("containers-info-block")).toBeInTheDocument()
    })

    test("shows total bucket count when no search is active", () => {
      renderContainers()
      expect(screen.getByText(/3 buckets/i)).toBeInTheDocument()
    })

    test("shows filtered count when search is active", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "bucket-1" })
      renderContainers()
      // Plural 'one' form: "1 of 3 bucket" (singular)
      expect(screen.getByText(/1 of 3 bucket/i)).toBeInTheDocument()
    })

    test("shows total count when search is cleared", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "" })
      renderContainers()
      expect(screen.getByText(/3 buckets/i)).toBeInTheDocument()
    })
  })

  describe("Search filtering", () => {
    test("filters buckets by search term from URL param", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "bucket-1" })
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-bucket-count", "1")
    })

    test("search filtering is case-insensitive", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "BUCKET-1" })
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-bucket-count", "1")
    })

    test("shows all buckets when search param is empty", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "" })
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-bucket-count", "3")
    })

    test("shows all buckets when search param is undefined", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: undefined })
      renderContainers()
      expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-bucket-count", "3")
    })
  })

  describe("Bulk actions menu", () => {
    test("Actions button is disabled when nothing is selected", () => {
      renderContainers()
      expect(actionsButton()).toBeDisabled()
    })

    test("Actions button becomes enabled after selecting a bucket", async () => {
      const user = userEvent.setup()
      renderContainers()
      await user.click(screen.getByTestId("simulate-select-bucket"))
      await waitFor(() => expect(actionsButton()).toBeEnabled())
    })

    test("shows the singular Empty Bucket item when one bucket is selected", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await user.click(actionsButton())
      expect(await screen.findByText("Empty Bucket")).toBeInTheDocument()
    })

    test("shows the plural Empty Buckets item when multiple buckets are selected", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectTwo(user)
      await user.click(actionsButton())
      expect(await screen.findByText("Empty Buckets")).toBeInTheDocument()
    })

    test("Actions button returns to disabled after deselecting all", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await user.click(screen.getByTestId("simulate-deselect-all"))
      await waitFor(() => expect(actionsButton()).toBeDisabled())
    })
  })

  describe("Bulk empty modal", () => {
    test("modal is not visible by default", () => {
      renderContainers()
      expect(screen.queryByTestId("empty-buckets-modal")).not.toBeInTheDocument()
    })

    test("choosing Empty Bucket from the Actions menu opens the modal", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      expect(screen.getByTestId("empty-buckets-modal")).toBeInTheDocument()
    })

    test("modal receives the selected bucket count", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      expect(screen.getByTestId("empty-buckets-modal")).toHaveAttribute("data-bucket-count", "1")
    })

    test("closing the modal hides it", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      await user.click(screen.getByRole("button", { name: "CloseEmptyAll" }))
      await waitFor(() => {
        expect(screen.queryByTestId("empty-buckets-modal")).not.toBeInTheDocument()
      })
    })

    test("clears selection and shows toast after successful empty", async () => {
      const { getBucketsEmptyCompleteToast } = await import("./ContainerToastNotifications")
      const user = userEvent.setup()
      renderContainers()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      await user.click(screen.getByTestId("simulate-empty-success"))
      await waitFor(() => {
        expect(getBucketsEmptyCompleteToast).toHaveBeenCalledWith(
          1,
          8,
          [],
          expect.objectContaining({ onDismiss: expect.any(Function) })
        )
        expect(actionsButton()).toBeDisabled()
      })
    })

    test("keeps failed buckets selected after partial error", async () => {
      const user = userEvent.setup()
      renderContainers()
      await selectTwo(user)
      await openEmptyModal(user, "Empty Buckets")
      await user.click(screen.getByTestId("simulate-empty-error"))
      await waitFor(() => {
        // Only bucket-1 failed — it stays selected; bucket-2 succeeded — cleared
        expect(screen.getByTestId("container-table-view")).toHaveAttribute("data-selected-count", "1")
      })
    })
  })
})
