import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { ComponentProps } from "react"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { DeletePcaModal } from "./DeletePcaModal"

const mockCa: CertificateAuthority = {
  id: "ca-123",
  project_id: "project-123",
  state: "READY",
}

const renderModal = (overrides: Partial<ComponentProps<typeof DeletePcaModal>> = {}) => {
  const props: ComponentProps<typeof DeletePcaModal> = {
    pca: mockCa,
    open: true,
    onClose: vi.fn(),
    ...overrides,
  }

  return {
    ...render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <DeletePcaModal {...props} />
        </PortalProvider>
      </I18nProvider>
    ),
    props,
  }
}

describe("DeletePcaModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders and keeps delete action disabled by default", () => {
    renderModal()

    expect(screen.getByText("Delete certificate authority")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled()
  })

  it("enables delete only when user types exact confirmation text", async () => {
    const user = userEvent.setup()
    renderModal()

    const deleteButton = screen.getByRole("button", { name: "Delete" })
    const confirmInput = screen.getByPlaceholderText('Type "delete" to confirm')

    await user.type(confirmInput, "Delete")
    expect(deleteButton).toBeDisabled()

    await user.clear(confirmInput)
    await user.type(confirmInput, "delete")
    expect(deleteButton).toBeEnabled()
  })

  it("submits delete request with ca id and closes modal", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderModal({ onClose })

    await user.type(screen.getByPlaceholderText('Type "delete" to confirm'), "delete")
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
