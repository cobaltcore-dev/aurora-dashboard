import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { Container } from "@/server/KeyManager/types/keyManager"
import { ContainerTableRow } from "./ContainerTableRow"

const mockContainer: Container = {
  container_ref: "https://barbican.example.com/v1/containers/container-123",
  name: "tls-bundle",
  type: "certificate",
  status: "ACTIVE",
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_refs: [{ name: "certificate", secret_ref: "https://barbican.example.com/v1/secrets/secret-1" }],
}

const renderRow = (container: Container = mockContainer, canDelete = true) => {
  const onShowDetails = vi.fn()
  const onDelete = vi.fn()
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerTableRow
          container={container}
          canDelete={canDelete}
          onShowDetails={onShowDetails}
          onDelete={onDelete}
        />
      </PortalProvider>
    </I18nProvider>
  )
  return { onShowDetails, onDelete }
}

describe("ContainerTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders the name and the id derived from the container_ref", () => {
      renderRow()

      expect(screen.getByText("tls-bundle")).toBeInTheDocument()
      expect(screen.getByText("container-123")).toBeInTheDocument()
    })

    it("renders 'unnamed' when the container has no name", () => {
      renderRow({ ...mockContainer, name: null })

      expect(screen.getByText("unnamed")).toBeInTheDocument()
    })

    it("renders the status and the type", () => {
      renderRow()

      expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      expect(screen.getByText("certificate")).toBeInTheDocument()
    })
  })

  describe("Row actions", () => {
    it("calls onShowDetails when Show Details is clicked", async () => {
      const user = userEvent.setup()
      const { onShowDetails } = renderRow()

      await user.click(screen.getByRole("button", { name: "More" }))
      await user.click(await screen.findByText("Show Details"))

      expect(onShowDetails).toHaveBeenCalledWith(mockContainer)
    })

    it("calls onDelete when Delete is clicked and the user may delete", async () => {
      const user = userEvent.setup()
      const { onDelete } = renderRow(mockContainer, true)

      await user.click(screen.getByRole("button", { name: "More" }))
      await user.click(await screen.findByText("Delete"))

      expect(onDelete).toHaveBeenCalledWith(mockContainer)
    })

    it("hides the Delete action when the user may not delete", async () => {
      const user = userEvent.setup()
      renderRow(mockContainer, false)

      await user.click(screen.getByRole("button", { name: "More" }))

      expect(await screen.findByText("Show Details")).toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })
  })
})
