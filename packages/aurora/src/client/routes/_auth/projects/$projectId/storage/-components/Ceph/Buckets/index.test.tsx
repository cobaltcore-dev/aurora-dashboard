import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CephBuckets } from "."
import type { Bucket } from "@/server/Storage/types/ceph"

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

vi.mock("@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType", () => ({
  Route: {
    fullPath: "/_auth/projects/$projectId/storage/$provider/$storageType/",
    useSearch: mockUseSearch,
  },
}))

// ─── Mock child components ────────────────────────────────────────────────────
// We test index.tsx in isolation — child components are tested separately.

let capturedSetSelectedBuckets: ((buckets: string[]) => void) | undefined

vi.mock("./BucketTableView", () => ({
  BucketTableView: vi.fn(({ buckets, createModalOpen, selectedBuckets, setSelectedBuckets }) => {
    capturedSetSelectedBuckets = setSelectedBuckets
    return (
      <div
        data-testid="bucket-table-view"
        data-bucket-count={buckets.length}
        data-create-modal-open={String(createModalOpen)}
        data-selected-count={selectedBuckets?.length ?? 0}
      >
        <button data-testid="simulate-select-bucket" onClick={() => setSelectedBuckets?.(["bucket-1"])}>
          SimulateSelectOne
        </button>
        <button data-testid="simulate-select-two" onClick={() => setSelectedBuckets?.(["bucket-1", "bucket-2"])}>
          SimulateSelectTwo
        </button>
        <button data-testid="simulate-deselect-all" onClick={() => setSelectedBuckets?.([])}>
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

vi.mock("./BucketToastNotifications", () => ({
  getBucketCreatedToast: vi.fn(() => ({ message: null, description: null })),
  getBucketCreateErrorToast: vi.fn(() => ({ message: null, description: null })),
  getBucketEmptiedToast: vi.fn(() => ({ message: null, description: null })),
  getBucketEmptyErrorToast: vi.fn(() => ({ message: null, description: null })),
  getBucketDeletedToast: vi.fn(() => ({ message: null, description: null })),
  getBucketDeleteErrorToast: vi.fn(() => ({ message: null, description: null })),
  getBucketsEmptyCompleteToast: vi.fn(() => ({ message: null, description: null })),
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockBuckets: Bucket[] = [
  { name: "bucket-1", creationDate: "2024-01-15T10:00:00Z", count: 5, bytes: 1024 },
  { name: "bucket-2", creationDate: "2024-01-16T10:00:00Z", count: 3, bytes: 512 },
  { name: "bucket-3", creationDate: "2024-01-17T10:00:00Z", count: 0, bytes: 0 },
]

let trpcState = {
  buckets: mockBuckets as Bucket[] | undefined,
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

const renderBuckets = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CephBuckets />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CephBuckets (index)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    resetSearch()
    trpcState = { buckets: mockBuckets, isLoading: false, error: null }
    capturedSetSelectedBuckets = undefined
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
      renderBuckets()
      expect(screen.getByText(/Loading Buckets/i)).toBeInTheDocument()
    })

    test("does not render table view while loading", () => {
      trpcState.isLoading = true
      trpcState.buckets = undefined
      renderBuckets()
      expect(screen.queryByTestId("bucket-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    test("shows error message when query fails", () => {
      trpcState.error = { message: "Network error" }
      trpcState.buckets = undefined
      renderBuckets()
      expect(screen.getByText(/Failed to load buckets/i)).toBeInTheDocument()
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    test("does not render table view on error", () => {
      trpcState.error = { message: "Network error" }
      renderBuckets()
      expect(screen.queryByTestId("bucket-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Rendering", () => {
    test("renders BucketTableView", () => {
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toBeInTheDocument()
    })

    test("passes correct bucket count to BucketTableView", () => {
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-bucket-count", "3")
    })

    test("renders Create Bucket button", () => {
      renderBuckets()
      expect(screen.getByRole("button", { name: /Create Bucket/i })).toBeInTheDocument()
    })

    test("renders the Actions button", () => {
      renderBuckets()
      expect(screen.getByRole("button", { name: /Actions/i })).toBeInTheDocument()
    })

    test("Actions button is disabled when no buckets are selected", () => {
      renderBuckets()
      expect(screen.getByRole("button", { name: /Actions/i })).toBeDisabled()
    })

    test("passes selectedBuckets and setSelectedBuckets to BucketTableView", () => {
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-selected-count", "0")
      expect(typeof capturedSetSelectedBuckets).toBe("function")
    })
  })

  describe("Info block", () => {
    test("renders buckets-info-block", () => {
      renderBuckets()
      expect(screen.getByTestId("buckets-info-block")).toBeInTheDocument()
    })

    test("shows total bucket count when no search is active", () => {
      renderBuckets()
      expect(screen.getByText(/3 buckets/i)).toBeInTheDocument()
    })

    test("shows filtered count when search is active", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "bucket-1" })
      renderBuckets()
      // Plural 'one' form: "1 of 3 bucket" (singular)
      expect(screen.getByText(/1 of 3 bucket/i)).toBeInTheDocument()
    })

    test("shows total count when search is cleared", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "" })
      renderBuckets()
      expect(screen.getByText(/3 buckets/i)).toBeInTheDocument()
    })
  })

  describe("Search filtering", () => {
    test("filters buckets by search term from URL param", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "bucket-1" })
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-bucket-count", "1")
    })

    test("search filtering is case-insensitive", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "BUCKET-1" })
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-bucket-count", "1")
    })

    test("shows all buckets when search param is empty", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: "" })
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-bucket-count", "3")
    })

    test("shows all buckets when search param is undefined", () => {
      mockUseSearch.mockReturnValue({ sortBy: undefined, sortDirection: undefined, search: undefined })
      renderBuckets()
      expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-bucket-count", "3")
    })
  })

  describe("Bulk actions menu", () => {
    test("Actions button is disabled when nothing is selected", () => {
      renderBuckets()
      expect(actionsButton()).toBeDisabled()
    })

    test("Actions button becomes enabled after selecting a bucket", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await user.click(screen.getByTestId("simulate-select-bucket"))
      await waitFor(() => expect(actionsButton()).toBeEnabled())
    })

    test("shows the singular Empty Bucket item when one bucket is selected", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await user.click(actionsButton())
      expect(await screen.findByText("Empty Bucket")).toBeInTheDocument()
    })

    test("shows the plural Empty Buckets item when multiple buckets are selected", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectTwo(user)
      await user.click(actionsButton())
      expect(await screen.findByText("Empty Buckets")).toBeInTheDocument()
    })

    test("Actions button returns to disabled after deselecting all", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await user.click(screen.getByTestId("simulate-deselect-all"))
      await waitFor(() => expect(actionsButton()).toBeDisabled())
    })
  })

  describe("Bulk empty modal", () => {
    test("modal is not visible by default", () => {
      renderBuckets()
      expect(screen.queryByTestId("empty-buckets-modal")).not.toBeInTheDocument()
    })

    test("choosing Empty Bucket from the Actions menu opens the modal", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      expect(screen.getByTestId("empty-buckets-modal")).toBeInTheDocument()
    })

    test("modal receives the selected bucket count", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      expect(screen.getByTestId("empty-buckets-modal")).toHaveAttribute("data-bucket-count", "1")
    })

    test("closing the modal hides it", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      await user.click(screen.getByRole("button", { name: "CloseEmptyAll" }))
      await waitFor(() => {
        expect(screen.queryByTestId("empty-buckets-modal")).not.toBeInTheDocument()
      })
    })

    test("clears selection and shows toast after successful empty", async () => {
      const { getBucketsEmptyCompleteToast } = await import("./BucketToastNotifications")
      const user = userEvent.setup()
      renderBuckets()
      await selectOne(user)
      await openEmptyModal(user, "Empty Bucket")
      await user.click(screen.getByTestId("simulate-empty-success"))
      await waitFor(() => {
        expect(getBucketsEmptyCompleteToast).toHaveBeenCalledWith(1, 8, [])
        expect(actionsButton()).toBeDisabled()
      })
    })

    test("keeps failed buckets selected after partial error", async () => {
      const user = userEvent.setup()
      renderBuckets()
      await selectTwo(user)
      await openEmptyModal(user, "Empty Buckets")
      await user.click(screen.getByTestId("simulate-empty-error"))
      await waitFor(() => {
        // Only bucket-1 failed — it stays selected; bucket-2 succeeded — cleared
        expect(screen.getByTestId("bucket-table-view")).toHaveAttribute("data-selected-count", "1")
      })
    })
  })
})
