import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
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

    await act(async () => {
      await user.click(cancelButton)
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test("calls onCreate with form data when Create button is clicked", async () => {
    const user = userEvent.setup()
    renderImageModal(true, mockOnClose, mockOnCreate)
    const nameInput = screen.getByLabelText("Image Name")

    await act(async () => {
      await user.type(nameInput, "Test Image")
    })

    const createButton = screen.getByText("Create Image")

    await act(async () => {
      await user.click(createButton)
    })

    expect(mockOnCreate).toHaveBeenCalledTimes(1)
    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Image",
        status: "active",
        visibility: "private",
        disk_format: "qcow2",
      })
    )

    expect(mockOnClose).toHaveBeenCalledTimes(1)
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

    const inactiveOption = screen.getByText("Inactive")
    await act(async () => {
      await user.click(inactiveOption)
    })

    const createButton = screen.getByText("Create Image")
    await act(async () => {
      await user.click(createButton)
    })

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Image Name",
        status: "inactive",
      })
    )
  })
})
