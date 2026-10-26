import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { Order } from "@/server/KeyManager/types/keyManager"
import { OrderTableRow } from "./OrderTableRow"

const mockOrder: Order = {
  order_ref: "https://barbican.example.com/v1/orders/order-123",
  type: "key",
  status: "ACTIVE",
  sub_status: null,
  sub_status_message: null,
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_ref: "https://barbican.example.com/v1/secrets/secret-1",
  meta: { name: "generated-key" },
}

const renderRow = (order: Order = mockOrder, canDelete = true) => {
  const onShowDetails = vi.fn()
  const onDelete = vi.fn()
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <OrderTableRow order={order} canDeleteOrder={canDelete} onShowDetails={onShowDetails} onDelete={onDelete} />
      </PortalProvider>
    </I18nProvider>
  )
  return { onShowDetails, onDelete }
}

describe("OrderTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders the id derived from the order_ref", () => {
      renderRow()

      expect(screen.getByText("order-123")).toBeInTheDocument()
    })

    it("renders the status and the type", () => {
      renderRow()

      expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      expect(screen.getByText("key")).toBeInTheDocument()
    })
  })

  describe("Row actions", () => {
    it("calls onShowDetails when Show Details is clicked", async () => {
      const user = userEvent.setup()
      const { onShowDetails } = renderRow()

      await user.click(screen.getByRole("button", { name: "Order actions" }))
      await user.click(await screen.findByText("Show Details"))

      expect(onShowDetails).toHaveBeenCalledWith(mockOrder)
    })

    it("calls onDelete when Delete is clicked and the user may delete", async () => {
      const user = userEvent.setup()
      const { onDelete } = renderRow(mockOrder, true)

      await user.click(screen.getByRole("button", { name: "Order actions" }))
      await user.click(await screen.findByText("Delete"))

      expect(onDelete).toHaveBeenCalledWith(mockOrder)
    })

    it("hides the Delete action when the user may not delete", async () => {
      const user = userEvent.setup()
      renderRow(mockOrder, false)

      await user.click(screen.getByRole("button", { name: "Order actions" }))

      expect(await screen.findByText("Show Details")).toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })
  })
})
