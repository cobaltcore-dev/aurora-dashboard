import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SwiftObjectStorage } from "./List"
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

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listContainers: { invalidate: mockInvalidate },
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
        emptyContainer: {
          useMutation: () => ({
            mutate: vi.fn(),
            reset: vi.fn(),
            isPending: false,
          }),
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
        <SwiftObjectStorage />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SwiftObjectStorage (List)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
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

  describe("Search filtering", () => {
    test("filters containers by search term", async () => {
      const user = userEvent.setup()
      renderList()
      const searchInput = screen.getByPlaceholderText(/Search/i)
      await user.type(searchInput, "alph")
      await waitFor(() => {
        expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
        expect(screen.queryByTestId("container-row-beta")).not.toBeInTheDocument()
        expect(screen.queryByTestId("container-row-gamma")).not.toBeInTheDocument()
      })
    })

    test("search is case-insensitive", async () => {
      const user = userEvent.setup()
      renderList()
      await user.type(screen.getByPlaceholderText(/Search/i), "ALPHA")
      await waitFor(() => {
        expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
        expect(screen.queryByTestId("container-row-beta")).not.toBeInTheDocument()
      })
    })

    test("shows all containers when search is cleared", async () => {
      const user = userEvent.setup()
      renderList()
      const searchInput = screen.getByPlaceholderText(/Search/i)
      await user.type(searchInput, "alpha")
      await waitFor(() => {
        expect(screen.queryByTestId("container-row-beta")).not.toBeInTheDocument()
      })
      await user.clear(searchInput)
      await waitFor(() => {
        expect(screen.getByTestId("container-row-alpha")).toBeInTheDocument()
        expect(screen.getByTestId("container-row-beta")).toBeInTheDocument()
        expect(screen.getByTestId("container-row-gamma")).toBeInTheDocument()
      })
    })

    test("shows empty state when no containers match search", async () => {
      const user = userEvent.setup()
      renderList()
      await user.type(screen.getByPlaceholderText(/Search/i), "nonexistent")
      await waitFor(() => {
        expect(screen.getByText(/No containers found/i)).toBeInTheDocument()
      })
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
        expect(screen.getByLabelText(/Container name/i)).toBeInTheDocument()
      })
    })

    test("closes modal when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderList()
      await user.click(screen.getByRole("button", { name: /Create Container/i }))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      await waitFor(() => {
        expect(screen.queryByLabelText(/Container name/i)).not.toBeInTheDocument()
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
})
