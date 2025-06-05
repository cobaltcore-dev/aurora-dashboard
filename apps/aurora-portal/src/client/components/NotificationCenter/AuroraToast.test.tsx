import { screen, fireEvent, waitFor } from "@testing-library/react"
import { ToastProps, auroraToast } from "./AuroraToast" // Adjust the import path accordingly
import { vi } from "vitest"
import { renderWithSonner } from "../../test-helper"
import { Button } from "@cloudoperators/juno-ui-components"

describe("Toast Component", () => {
  it("should show toast notification with correct content", async () => {
    const buttonClick = vi.fn()

    // Render the component with Sonner
    renderWithSonner(
      <Button
        className="hover:bg-gray-600"
        onClick={() => {
          const toastProps: Omit<ToastProps, "id"> = {
            title: "All great you are awesome",
            description: "Is this not amazing folks?",
            variant: "success",
            button: {
              label: "Dismiss",
              onClick: buttonClick, // FIXED: directly passing the function
            },
          }
          auroraToast(toastProps)
        }}
      >
        Click Me
      </Button>
    )

    // Simulate button click
    fireEvent.click(screen.getByText("Click Me"))

    // Wait for the toast to appear in the DOM
    await waitFor(() => {
      expect(screen.getByText("All great you are awesome")).toBeInTheDocument()
      expect(screen.getByText("Is this not amazing folks?")).toBeInTheDocument()
    })

    // Click the "Dismiss" button and verify the callback was called
    fireEvent.click(screen.getByText("Dismiss"))
    expect(buttonClick).toHaveBeenCalled()
  })
})
