import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { Secret } from "@/server/KeyManager/types/keyManager"
import { SecretTableRow } from "./SecretTableRow"

const mockSecret: Secret = {
  secret_ref: "https://barbican.example.com/v1/secrets/secret-123",
  name: "db-password",
  status: "ACTIVE",
  algorithm: "aes",
  bit_length: 256,
  mode: "cbc",
  secret_type: "opaque",
  content_types: { default: "text/plain" },
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  expiration: null,
}

const renderRow = (secret: Secret = mockSecret, canDelete = true) => {
  const onShowDetails = vi.fn()
  const onDelete = vi.fn()
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <SecretTableRow secret={secret} canDeleteSecret={canDelete} onShowDetails={onShowDetails} onDelete={onDelete} />
      </PortalProvider>
    </I18nProvider>
  )
  return { onShowDetails, onDelete }
}

describe("SecretTableRow", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders the name and the id derived from the secret_ref", () => {
      renderRow()

      expect(screen.getByText("db-password")).toBeInTheDocument()
      expect(screen.getByText("secret-123")).toBeInTheDocument()
    })

    it("renders 'unnamed' when the secret has no name", () => {
      renderRow({ ...mockSecret, name: null })

      expect(screen.getByText("unnamed")).toBeInTheDocument()
    })

    it("renders the status and the secret type", () => {
      renderRow()

      expect(screen.getByText("ACTIVE")).toBeInTheDocument()
      expect(screen.getByText("opaque")).toBeInTheDocument()
    })

    it("joins the content types", () => {
      renderRow({ ...mockSecret, content_types: { default: "text/plain", other: "application/octet-stream" } })

      expect(screen.getByText("text/plain, application/octet-stream")).toBeInTheDocument()
    })

    it("renders '- -' when content types are missing", () => {
      renderRow({ ...mockSecret, content_types: null })

      expect(screen.getByText("- -")).toBeInTheDocument()
    })
  })

  describe("Row actions", () => {
    it("calls onShowDetails when Show Details is clicked", async () => {
      const user = userEvent.setup()
      const { onShowDetails } = renderRow()

      await user.click(screen.getByRole("button", { name: "Secret actions" }))
      await user.click(await screen.findByText("Show Details"))

      expect(onShowDetails).toHaveBeenCalledWith(mockSecret)
    })

    it("calls onDelete when Delete is clicked and the user may delete", async () => {
      const user = userEvent.setup()
      const { onDelete } = renderRow(mockSecret, true)

      await user.click(screen.getByRole("button", { name: "Secret actions" }))
      await user.click(await screen.findByText("Delete"))

      expect(onDelete).toHaveBeenCalledWith(mockSecret)
    })

    it("hides the Delete action when the user may not delete", async () => {
      const user = userEvent.setup()
      renderRow(mockSecret, false)

      await user.click(screen.getByRole("button", { name: "Secret actions" }))

      expect(await screen.findByText("Show Details")).toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })
  })
})
