import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { TRPCClientError } from "@trpc/client"
import type { TrpcClient } from "@/client/trpcClient"
import type { RouterListItem } from "@/server/Network/types/router"
import { Routers } from "./RoutersList"

// Mock useSearch / useNavigate; navigate applies search updaters to the mocked URL search params
let mockSearchParams: Record<string, unknown> = {}

const mockNavigate = vi.fn(
  (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace?: boolean }) => {
    if (typeof opts.search === "function") {
      mockSearchParams = opts.search(mockSearchParams)
    }
  }
)

vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(() => mockSearchParams),
  useNavigate: vi.fn(() => mockNavigate),
}))

vi.mock("./RouterListContainer", () => ({
  RouterListContainer: ({
    routers,
    currentPage,
    totalPages,
    onPageChange,
  }: {
    routers?: RouterListItem[]
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
  }) => (
    <div data-testid="router-list-container" data-current-page={currentPage} data-total-pages={totalPages}>
      {routers?.map((router) => (
        <div key={router.id} data-testid={`router-${router.id}`}>
          {router.name}
        </div>
      ))}
      <button onClick={() => onPageChange?.(2)}>Go to page 2</button>
    </div>
  ),
}))

const makeRouter = (id: string, name = id): RouterListItem => ({
  id,
  name,
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  project_id: "proj-1",
  routes: [],
  external_gateway_info: null,
  private_networks: [],
})

const mockRouters = [makeRouter("router-1", "edge-router"), makeRouter("router-2", "internal-router")]

const createMockClient = (query: ReturnType<typeof vi.fn>) =>
  ({ network: { routers: { list: { query } } } }) as unknown as TrpcClient

// The list suspends on a promise (React `use`), so render inside an async act scope to let it resolve
const renderList = async (query = vi.fn().mockResolvedValue(mockRouters)) => {
  const client = createMockClient(query)
  await act(async () => {
    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <Routers client={client} project="proj-1" />
        </PortalProvider>
      </I18nProvider>
    )
  })
  return { query }
}

const lastNavigateSearch = () => {
  const [opts] = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1]
  return opts.search({})
}

describe("Routers", () => {
  beforeEach(() => {
    i18n.activate("en")
    mockSearchParams = {}
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Loading data", () => {
    it("shows a loading state until routers are loaded", async () => {
      await renderList(vi.fn(() => new Promise(() => {})))

      expect(await screen.findByText("Loading Routers...")).toBeInTheDocument()
      expect(screen.queryByTestId("router-list-container")).not.toBeInTheDocument()
    })

    it("renders the loaded routers", async () => {
      await renderList()

      expect(await screen.findByTestId("router-router-1")).toHaveTextContent("edge-router")
      expect(screen.getByTestId("router-router-2")).toHaveTextContent("internal-router")
    })

    it("queries routers for the project with default sorting", async () => {
      const { query } = await renderList()

      await screen.findByTestId("router-list-container")

      expect(query).toHaveBeenCalledWith({
        project_id: "proj-1",
        sort_key: "name",
        sort_dir: "asc",
        searchTerm: undefined,
      })
    })

    it("uses search, sort and direction from the URL for the initial query", async () => {
      mockSearchParams = { search: "edge", sortBy: "status", sortDirection: "desc" }
      const { query } = await renderList()

      await screen.findByTestId("router-list-container")

      expect(query).toHaveBeenCalledWith({
        project_id: "proj-1",
        sort_key: "status",
        sort_dir: "desc",
        searchTerm: "edge",
      })
      expect(screen.getByRole("searchbox")).toHaveValue("edge")
    })

    it("does not render a create action (read-only)", async () => {
      await renderList()

      await screen.findByTestId("router-list-container")

      expect(screen.queryByRole("button", { name: /create router/i })).not.toBeInTheDocument()
    })
  })

  describe("Errors", () => {
    it("shows an inline error when listing is forbidden", async () => {
      const forbidden = new TRPCClientError("You are not allowed to list routers", {
        result: {
          error: {
            code: -32603,
            message: "You are not allowed to list routers",
            data: { code: "FORBIDDEN", httpStatus: 403 },
          },
        },
      } as never)
      await renderList(vi.fn().mockRejectedValue(forbidden))

      expect(await screen.findByText("You are not allowed to list routers")).toBeInTheDocument()
      expect(screen.getByText("Failed to Load Routers")).toBeInTheDocument()
      expect(screen.queryByTestId("router-list-container")).not.toBeInTheDocument()
    })

    it("shows the error boundary fallback for other errors", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
      await renderList(vi.fn().mockRejectedValue(new Error("Neutron is unavailable")))

      expect(await screen.findByText("Failed to Load Routers")).toBeInTheDocument()
      expect(screen.getByText("Neutron is unavailable")).toBeInTheDocument()

      consoleError.mockRestore()
    })
  })

  describe("Search", () => {
    it("refetches with the search term and updates the URL on submit", async () => {
      const user = userEvent.setup()
      const { query } = await renderList()

      await screen.findByTestId("router-list-container")
      await user.type(screen.getByRole("searchbox"), "edge{enter}")

      await waitFor(() => {
        expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ searchTerm: "edge" }))
      })
      expect(mockNavigate).toHaveBeenLastCalledWith(expect.objectContaining({ replace: true }))
      expect(lastNavigateSearch()).toEqual({ search: "edge", page: undefined })
    })
  })

  describe("Pagination", () => {
    it("shows 50 routers per page", async () => {
      const manyRouters = Array.from({ length: 51 }, (_, i) => makeRouter(`router-${i}`))
      await renderList(vi.fn().mockResolvedValue(manyRouters))

      const container = await screen.findByTestId("router-list-container")

      expect(container).toHaveAttribute("data-total-pages", "2")
      expect(container).toHaveAttribute("data-current-page", "1")
      expect(screen.getByTestId("router-router-0")).toBeInTheDocument()
      expect(screen.queryByTestId("router-router-50")).not.toBeInTheDocument()
    })

    it("shows the page from the URL", async () => {
      mockSearchParams = { page: 2 }
      const manyRouters = Array.from({ length: 51 }, (_, i) => makeRouter(`router-${i}`))
      await renderList(vi.fn().mockResolvedValue(manyRouters))

      const container = await screen.findByTestId("router-list-container")

      expect(container).toHaveAttribute("data-current-page", "2")
      expect(screen.getByTestId("router-router-50")).toBeInTheDocument()
      expect(screen.queryByTestId("router-router-0")).not.toBeInTheDocument()
    })

    it("updates the page in the URL on page change", async () => {
      const user = userEvent.setup()
      await renderList()

      await screen.findByTestId("router-list-container")
      await user.click(screen.getByRole("button", { name: "Go to page 2" }))

      expect(lastNavigateSearch()).toEqual({ page: 2 })
    })

    it("resets to the first page when the page in the URL is out of range", async () => {
      mockSearchParams = { page: 5 }
      await renderList()

      await screen.findByTestId("router-list-container")

      await waitFor(() => {
        expect(lastNavigateSearch()).toEqual({ page: undefined })
      })
    })
  })
})
