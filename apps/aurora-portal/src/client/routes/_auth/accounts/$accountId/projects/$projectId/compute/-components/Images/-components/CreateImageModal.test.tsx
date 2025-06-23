import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { CreateImageModal } from "./CreateImageModal"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"

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

  test("renders when isOpen is true", () => {
    renderImageModal(true, mockOnClose, mockOnCreate)
    expect(screen.getByText("Create New Image")).toBeDefined()
  })

  test("does not render when isOpen is false", () => {
    renderImageModal(false, mockOnClose, mockOnCreate)
    expect(screen.queryByTestId("dialog")).toBeNull()
  })

  test("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup()

    renderImageModal(true, mockOnClose, mockOnCreate)

    const cancelButton = screen.getByText("Cancel")
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("calls onCreate with form data when Create button is clicked", async () => {
    const user = userEvent.setup()

    renderImageModal(true, mockOnClose, mockOnCreate)

    const nameInput = screen.getByLabelText("Image Name")
    await user.type(nameInput, "Test Image")

    const createButton = screen.getByText("Create Image")
    await user.click(createButton)

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledTimes(1)
    })

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Image",
        status: "active",
        visibility: "private",
        disk_format: "qcow2",
      })
    )

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  test("allows user to submit form", async () => {
    const user = userEvent.setup()

    renderImageModal(true, mockOnClose, mockOnCreate)

    const nameInput = screen.getByLabelText("Image Name")
    await user.type(nameInput, "Test Image Name")

    const statusSelect = screen.getByLabelText("Status")
    await user.click(statusSelect)

    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument()
    })

    const inactiveOption = screen.getByText("Inactive")
    await user.click(inactiveOption)

    const createButton = screen.getByText("Create Image")
    await user.click(createButton)

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
