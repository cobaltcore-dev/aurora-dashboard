import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CreateImageModal } from "./CreateImageModal"
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
    renderImageModal(true, mockOnClose, mockOnCreate)

    await waitFor(async () => {
      const nameInput = screen.getByLabelText("Image Name")
      await fireEvent.change(nameInput, { target: { value: "Test Image Name" } })
    })

    await waitFor(async () => {
      const statusSelect = screen.getByLabelText("Status")
      await fireEvent.click(statusSelect)
    })

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument()
    })

    await waitFor(async () => {
      const inactiveOption = screen.getByText("Inactive")
      await fireEvent.click(inactiveOption)
    })

    await waitFor(async () => {
      const createButton = screen.getByText("Create Image")
      await fireEvent.click(createButton)
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
