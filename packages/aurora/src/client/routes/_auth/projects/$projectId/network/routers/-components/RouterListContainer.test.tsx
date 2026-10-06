import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { RouterListItem } from "@/server/Network/types/router"
import { RouterListContainer } from "./RouterListContainer"

vi.mock("./RouterTableRow", () => ({
  RouterTableRow: ({ router }: { router: RouterListItem }) => (
    <div role="row" data-testid={`router-row-${router.id}`}>
      {router.name}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeRouter = (id: string, name: string): RouterListItem => ({
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

describe("RouterListContainer", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Columns", () => {
    it("renders all column headers", () => {
      render(<RouterListContainer routers={mockRouters} />, { wrapper: TestWrapper })

      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("External Network")).toBeInTheDocument()
      expect(screen.getByText("External Subnet")).toBeInTheDocument()
      expect(screen.getByText("Private Network")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    it("renders 5 data columns and 1 actions column", () => {
      render(<RouterListContainer routers={mockRouters} />, { wrapper: TestWrapper })

      expect(screen.getAllByRole("columnheader")).toHaveLength(6)
    })

    it("does not render a Project column", () => {
      render(<RouterListContainer routers={mockRouters} />, { wrapper: TestWrapper })

      expect(screen.queryByText("Project")).not.toBeInTheDocument()
    })

    it("aligns cells to the top", () => {
      // With cellVerticalAlignment="top", Juno renders cells without the vertical centering class
      render(<RouterListContainer routers={[]} />, { wrapper: TestWrapper })

      const cell = screen.getByRole("gridcell")
      expect(cell).toHaveClass("juno-datagrid-cell")
      expect(cell).not.toHaveClass("jn:justify-center")
    })

    it("renders column headers in the empty state as well", () => {
      render(<RouterListContainer routers={[]} />, { wrapper: TestWrapper })

      expect(screen.getByText("Private Network")).toBeInTheDocument()
    })
  })

  describe("Data state", () => {
    it("renders a table row for each router", () => {
      render(<RouterListContainer routers={mockRouters} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("router-row-router-1")).toBeInTheDocument()
      expect(screen.getByTestId("router-row-router-2")).toBeInTheDocument()
      expect(screen.getAllByRole("row")).toHaveLength(3) // 1 header row + 2 data rows
    })

    it("does not render the empty state when routers are present", () => {
      render(<RouterListContainer routers={mockRouters} />, { wrapper: TestWrapper })

      expect(screen.queryByText("No routers found")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no routers", () => {
      render(<RouterListContainer routers={[]} />, { wrapper: TestWrapper })

      expect(screen.getByText("No routers found")).toBeInTheDocument()
      expect(screen.getByText(/There are no routers available for this project/)).toBeInTheDocument()
    })

    it("renders the empty state when routers are undefined", () => {
      render(<RouterListContainer routers={undefined} />, { wrapper: TestWrapper })

      expect(screen.getByText("No routers found")).toBeInTheDocument()
    })

    it("renders the empty state inside the table", () => {
      render(<RouterListContainer routers={[]} />, { wrapper: TestWrapper })

      expect(screen.getByRole("status")).toBeInTheDocument()
    })
  })

  describe("Pagination", () => {
    it("does not render pagination for a single page", () => {
      render(<RouterListContainer routers={mockRouters} currentPage={1} totalPages={1} />, { wrapper: TestWrapper })

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("calls onPageChange with a valid page number when Enter is pressed", () => {
      const onPageChange = vi.fn()
      render(<RouterListContainer routers={mockRouters} currentPage={1} totalPages={5} onPageChange={onPageChange} />, {
        wrapper: TestWrapper,
      })

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "3" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 })

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it("does not call onPageChange for empty input when Enter is pressed", () => {
      const onPageChange = vi.fn()
      render(<RouterListContainer routers={mockRouters} currentPage={1} totalPages={5} onPageChange={onPageChange} />, {
        wrapper: TestWrapper,
      })

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 })

      expect(onPageChange).not.toHaveBeenCalled()
    })
  })
})
