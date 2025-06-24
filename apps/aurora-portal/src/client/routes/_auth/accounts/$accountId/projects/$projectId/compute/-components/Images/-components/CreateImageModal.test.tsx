import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import { CreateImageModal } from "./CreateImageModal"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"

const renderImageModal = (isOpen = true, onClose = vi.fn(), onCreate = vi.fn()) => {
  return render(
    <PortalProvider>
      <CreateImageModal isOpen={isOpen} onClose={onClose} onCreate={onCreate} />
    </PortalProvider>
  )
}

describe("CreateImageModal", () => {
  const mockOnCreate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  test("allows user to submit form", async () => {
    const user = userEvent.setup()
    renderImageModal(true, mockOnClose, mockOnCreate)

    const nameInput = screen.getByLabelText("Image Name")
    await act(async () => {
      await user.type(nameInput, "Test Image Name")
    })

    const statusSelect = screen.getByLabelText("Status")
    await act(async () => {
      await user.click(statusSelect)
    })

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument()
    })

    const inactiveOption = screen.getByText("Inactive")
    await act(async () => {
      await user.click(inactiveOption)
    })

    const createButton = screen.getByText("Create Image")
    await act(async () => {
      await user.click(createButton)
    })

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Image Name",
          status: "inactive",
        })
      )
    })
  })
})
