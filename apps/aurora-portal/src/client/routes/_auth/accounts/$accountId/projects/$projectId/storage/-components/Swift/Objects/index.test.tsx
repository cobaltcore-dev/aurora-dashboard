import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SwiftObjects } from "./"
import type { ObjectSummary } from "@/server/Storage/types/swift"

// ─── Mock TanStack Router ─────────────────────────────────────────────────────
// useParams, useNavigate and Route hooks all require a live router context.
// We return stable fixture values so the component renders without a Provider.

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

// ─── Mock Route (search params + fullPath) ────────────────────────────────────

vi.mock("../../../$provider/containers/$containerName/objects/$", () => ({
  Route: {
    fullPath: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
    useSearch: vi.fn(() => ({ prefix: undefined })),
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
  },
}))

// ─── Mock child components ────────────────────────────────────────────────────
// We test index.tsx in isolation — child components are tested separately.

vi.mock("./ObjectsTableView", () => ({
  ObjectsTableView: vi.fn(({ rows, searchTerm }) => (
    <div data-testid="objects-table-view" data-row-count={rows.length} data-search={searchTerm} />
  )),
}))

vi.mock("./ObjectsFileNavigation", () => ({
  ObjectsFileNavigation: vi.fn(({ containerName, currentPrefix }) => (
    <div data-testid="objects-file-navigation" data-container={containerName} data-prefix={currentPrefix} />
  )),
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

const mockObjects: ObjectSummary[] = [
  { name: "file-a.txt", hash: "abc", bytes: 100, content_type: "text/plain", last_modified: "2024-03-01T08:00:00" },
  { name: "file-b.png", hash: "def", bytes: 2048, content_type: "image/png", last_modified: "2024-02-01T08:00:00" },
  {
    name: "folder/",
    hash: "000",
    bytes: 0,
    content_type: "application/directory",
    last_modified: "2024-01-01T08:00:00",
  },
]

let trpcState = {
  objects: mockObjects as ObjectSummary[] | undefined,
  isLoading: false,
  error: null as { message: string } | null,
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      swift: {
        listObjects: {
          useQuery: () => ({
            data: trpcState.objects,
            isLoading: trpcState.isLoading,
            error: trpcState.error,
          }),
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderObjects = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SwiftObjects />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SwiftObjects (index)", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    trpcState = { objects: mockObjects, isLoading: false, error: null }
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Loading state", () => {
    test("shows loading spinner while fetching", () => {
      trpcState.isLoading = true
      trpcState.objects = undefined
      renderObjects()
      expect(screen.getByText(/Loading Objects/i)).toBeInTheDocument()
    })

    test("does not render table view while loading", () => {
      trpcState.isLoading = true
      trpcState.objects = undefined
      renderObjects()
      expect(screen.queryByTestId("objects-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    test("shows error message when query fails", () => {
      trpcState.error = { message: "Network error" }
      trpcState.objects = undefined
      renderObjects()
      expect(screen.getByText(/Error Loading Objects/i)).toBeInTheDocument()
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    test("does not render table view on error", () => {
      trpcState.error = { message: "Network error" }
      renderObjects()
      expect(screen.queryByTestId("objects-table-view")).not.toBeInTheDocument()
    })
  })

  describe("Rendering", () => {
    test("renders ObjectsFileNavigation with correct container name", () => {
      renderObjects()
      const nav = screen.getByTestId("objects-file-navigation")
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveAttribute("data-container", "test-container")
    })

    test("renders ObjectsTableView", () => {
      renderObjects()
      expect(screen.getByTestId("objects-table-view")).toBeInTheDocument()
    })

    test("passes correct row count to ObjectsTableView", () => {
      renderObjects()
      // 2 files + 1 folder from mockObjects
      const view = screen.getByTestId("objects-table-view")
      expect(view).toHaveAttribute("data-row-count", "3")
    })
  })

  describe("Search filtering", () => {
    test("passes search term to ObjectsTableView", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.type(screen.getByPlaceholderText(/Search/i), "file-a")
      await waitFor(() => {
        const view = screen.getByTestId("objects-table-view")
        expect(view).toHaveAttribute("data-search", "file-a")
      })
    })

    test("filters rows by search term", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.type(screen.getByPlaceholderText(/Search/i), "file-a")
      await waitFor(() => {
        const view = screen.getByTestId("objects-table-view")
        expect(view).toHaveAttribute("data-row-count", "1")
      })
    })

    test("search is case-insensitive", async () => {
      const user = userEvent.setup()
      renderObjects()
      await user.type(screen.getByPlaceholderText(/Search/i), "FILE-A")
      await waitFor(() => {
        expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "1")
      })
    })

    test("shows all rows when search is cleared", async () => {
      const user = userEvent.setup()
      renderObjects()
      const input = screen.getByPlaceholderText(/Search/i)
      await user.type(input, "file-a")
      await waitFor(() => {
        expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "1")
      })
      await user.clear(input)
      await waitFor(() => {
        expect(screen.getByTestId("objects-table-view")).toHaveAttribute("data-row-count", "3")
      })
    })
  })
})
