import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { NetworkListContainer } from "./NetworkListContainer"

vi.mock("./NetworkTableRow", () => ({
  NetworkTableRow: ({ network }: { network: NetworkListItem }) => (
    <div role="row" data-testid={`network-row-${network.id}`}>
      {network.name}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeNetwork = (id: string, name: string): NetworkListItem => ({
  id,
  name,
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: [],
  subnet_details: [],
  project_id: "proj-1",
})

const mockNetworks = [makeNetwork("net-1", "private"), makeNetwork("net-2", "db")]

describe("NetworkListContainer", () => {
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
      render(<NetworkListContainer networks={mockNetworks} />, { wrapper: TestWrapper })

      for (const header of ["Name", "Status", "Admin State", "Subnets", "Shared", "External"]) {
        expect(screen.getByText(header)).toBeInTheDocument()
      }
    })

    it("does not render an MTU column", () => {
      render(<NetworkListContainer networks={mockNetworks} />, { wrapper: TestWrapper })

      expect(screen.queryByText("MTU")).not.toBeInTheDocument()
    })

    it("renders 6 data columns and 1 actions column", () => {
      render(<NetworkListContainer networks={mockNetworks} />, { wrapper: TestWrapper })

      expect(screen.getAllByRole("columnheader")).toHaveLength(7)
    })

    it("does not render a Project column", () => {
      render(<NetworkListContainer networks={mockNetworks} />, { wrapper: TestWrapper })

      expect(screen.queryByText("Project")).not.toBeInTheDocument()
    })

    it("aligns cells to the top", () => {
      // With cellVerticalAlignment="top", Juno renders cells without the vertical centering class
      render(<NetworkListContainer networks={[]} />, { wrapper: TestWrapper })

      const cell = screen.getByRole("gridcell")
      expect(cell).toHaveClass("juno-datagrid-cell")
      expect(cell).not.toHaveClass("jn:justify-center")
    })
  })

  describe("Data state", () => {
    it("renders a table row for each network", () => {
      render(<NetworkListContainer networks={mockNetworks} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("network-row-net-1")).toHaveTextContent("private")
      expect(screen.getByTestId("network-row-net-2")).toHaveTextContent("db")
      expect(screen.queryByText("No Networks Found")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no networks", () => {
      render(<NetworkListContainer networks={[]} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Networks Found")).toBeInTheDocument()
      expect(screen.getByText("There are no networks in this project.")).toBeInTheDocument()
    })

    it("suggests clearing search and filters when they are applied", () => {
      render(<NetworkListContainer networks={[]} isFiltered />, { wrapper: TestWrapper })

      expect(
        screen.getByText("No networks match your search or filters. Clear them to view all networks.")
      ).toBeInTheDocument()
    })

    it("renders the empty state when networks are undefined", () => {
      render(<NetworkListContainer />, { wrapper: TestWrapper })

      expect(screen.getByText("No Networks Found")).toBeInTheDocument()
    })
  })
})
