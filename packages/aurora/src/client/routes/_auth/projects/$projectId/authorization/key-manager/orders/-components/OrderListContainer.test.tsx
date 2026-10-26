import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Order } from "@/server/KeyManager/types/keyManager"
import { OrderListContainer } from "./OrderListContainer"

vi.mock("./OrderTableRow", () => ({
  OrderTableRow: ({ order }: { order: Order }) => (
    <div role="row" data-testid={`order-row-${order.order_ref}`}>
      {order.type}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeOrder = (ref: string, type: string): Order => ({
  order_ref: ref,
  type,
  status: "ACTIVE",
  sub_status: null,
  sub_status_message: null,
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_ref: null,
  meta: {},
})

const mockOrders = [makeOrder("order-1", "key"), makeOrder("order-2", "asymmetric")]

const defaultProps = {
  isLoading: false,
  isError: false,
  error: null,
  canDeleteOrder: true,
  onShowDetails: vi.fn(),
  onDelete: vi.fn(),
}

describe("OrderListContainer", () => {
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
    it("renders the column headers in spec order (status right after the primary column)", () => {
      render(<OrderListContainer orders={mockOrders} {...defaultProps} />, { wrapper: TestWrapper })

      const headers = screen.getAllByRole("columnheader")
      // ID, Status, Type, actions
      expect(headers).toHaveLength(4)
      expect(headers[0]).toHaveTextContent("ID")
      expect(headers[1]).toHaveTextContent("Status")
      expect(headers[2]).toHaveTextContent("Type")
    })
  })

  describe("Data state", () => {
    it("renders a row for each order", () => {
      render(<OrderListContainer orders={mockOrders} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("order-row-order-1")).toBeInTheDocument()
      expect(screen.getByTestId("order-row-order-2")).toBeInTheDocument()
      expect(screen.getAllByRole("row")).toHaveLength(3) // header + 2 data rows
    })
  })

  describe("Loading state", () => {
    it("renders a progress status while loading", () => {
      render(<OrderListContainer orders={[]} {...defaultProps} isLoading />, { wrapper: TestWrapper })

      expect(screen.getByText("Loading Orders...")).toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("renders the error message when the request failed", () => {
      render(<OrderListContainer orders={[]} {...defaultProps} isError error={{ message: "Boom" }} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Boom")).toBeInTheDocument()
    })

    it("falls back to a generic error message", () => {
      render(<OrderListContainer orders={[]} {...defaultProps} isError error={null} />, { wrapper: TestWrapper })

      expect(screen.getByText("Failed to Load Orders")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no orders", () => {
      render(<OrderListContainer orders={[]} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Orders Found")).toBeInTheDocument()
    })
  })
})
