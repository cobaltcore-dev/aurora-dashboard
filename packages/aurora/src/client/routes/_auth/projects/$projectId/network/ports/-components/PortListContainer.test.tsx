import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { PortListItem } from "@/server/Network/types/port"
import { PortListContainer } from "./PortListContainer"

vi.mock("./PortTableRow", () => ({
  PortTableRow: ({ port, showNetwork }: { port: PortListItem; showNetwork?: boolean }) => (
    <div role="row" data-testid={`port-row-${port.id}`} data-show-network={String(showNetwork)}>
      {port.name}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makePort = (id: string, name: string): PortListItem => ({
  id,
  name,
  description: "",
  network_id: "net-1",
  mac_address: "fa:16:3e:50:a2:79",
  admin_state_up: true,
  status: "ACTIVE",
  device_id: "",
  device_owner: "",
  fixed_ips: [],
  security_groups: [],
  allowed_address_pairs: [],
  project_id: "proj-1",
})

const mockPorts = [makePort("port-1", "db-port"), makePort("port-2", "reserved-ip")]

describe("PortListContainer", () => {
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
      render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })

      expect(screen.getByText("Name / ID")).toBeInTheDocument()
      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByText("Network")).toBeInTheDocument()
      expect(screen.getByText("Fixed IPs / Subnet")).toBeInTheDocument()
      expect(screen.getByText("Device Owner / ID")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    it("renders 6 data columns and 1 actions column", () => {
      render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })

      expect(screen.getAllByRole("columnheader")).toHaveLength(7)
    })

    it("does not render a Project column", () => {
      render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })

      expect(screen.queryByText("Project")).not.toBeInTheDocument()
    })

    it("aligns cells to the top", () => {
      // With cellVerticalAlignment="top", Juno renders cells without the vertical centering class
      render(<PortListContainer ports={[]} />, { wrapper: TestWrapper })

      const cell = screen.getByRole("gridcell")
      expect(cell).toHaveClass("juno-datagrid-cell")
      expect(cell).not.toHaveClass("jn:justify-center")
    })

    it("renders column headers in the empty state as well", () => {
      render(<PortListContainer ports={[]} />, { wrapper: TestWrapper })

      expect(screen.getByText("Fixed IPs / Subnet")).toBeInTheDocument()
    })
  })

  describe("Network scope", () => {
    it("hides the Network column when scoped to a network", () => {
      render(<PortListContainer ports={mockPorts} isNetworkScoped />, { wrapper: TestWrapper })

      expect(screen.queryByText("Network")).not.toBeInTheDocument()
      expect(screen.getAllByRole("columnheader")).toHaveLength(6)
    })

    it("tells the rows whether to show the network", () => {
      const { unmount } = render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })
      expect(screen.getByTestId("port-row-port-1")).toHaveAttribute("data-show-network", "true")
      unmount()

      render(<PortListContainer ports={mockPorts} isNetworkScoped />, { wrapper: TestWrapper })
      expect(screen.getByTestId("port-row-port-1")).toHaveAttribute("data-show-network", "false")
    })

    it("uses a network-specific empty state", () => {
      render(<PortListContainer ports={[]} isNetworkScoped />, { wrapper: TestWrapper })

      expect(screen.getByText("There are no ports on this network.")).toBeInTheDocument()
    })
  })

  describe("Data state", () => {
    it("renders a table row for each port", () => {
      render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("port-row-port-1")).toBeInTheDocument()
      expect(screen.getByTestId("port-row-port-2")).toBeInTheDocument()
      expect(screen.getAllByRole("row")).toHaveLength(3) // 1 header row + 2 data rows
    })

    it("does not render the empty state when ports are present", () => {
      render(<PortListContainer ports={mockPorts} />, { wrapper: TestWrapper })

      expect(screen.queryByText("No Ports Found")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no ports", () => {
      render(<PortListContainer ports={[]} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Ports Found")).toBeInTheDocument()
      expect(screen.getByText("There are no ports in this project.")).toBeInTheDocument()
    })

    it("suggests clearing the search when a search is applied", () => {
      render(<PortListContainer ports={[]} hasSearch />, { wrapper: TestWrapper })

      expect(screen.getByText("No ports match your search. Clear the search to view all ports.")).toBeInTheDocument()
      expect(screen.queryByText("There are no ports in this project.")).not.toBeInTheDocument()
    })

    it("renders the empty state when ports are undefined", () => {
      render(<PortListContainer ports={undefined} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Ports Found")).toBeInTheDocument()
    })

    it("renders the empty state inside the table", () => {
      render(<PortListContainer ports={[]} />, { wrapper: TestWrapper })

      expect(screen.getByRole("status")).toBeInTheDocument()
    })
  })

  describe("Pagination", () => {
    it("does not render pagination for a single page", () => {
      render(<PortListContainer ports={mockPorts} currentPage={1} totalPages={1} />, { wrapper: TestWrapper })

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("calls onPageChange with a valid page number when Enter is pressed", () => {
      const onPageChange = vi.fn()
      render(<PortListContainer ports={mockPorts} currentPage={1} totalPages={5} onPageChange={onPageChange} />, {
        wrapper: TestWrapper,
      })

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "3" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 })

      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it("does not call onPageChange for empty input when Enter is pressed", () => {
      const onPageChange = vi.fn()
      render(<PortListContainer ports={mockPorts} currentPage={1} totalPages={5} onPageChange={onPageChange} />, {
        wrapper: TestWrapper,
      })

      const input = screen.getByRole("textbox")
      fireEvent.change(input, { target: { value: "" } })
      fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 })

      expect(onPageChange).not.toHaveBeenCalled()
    })
  })
})
