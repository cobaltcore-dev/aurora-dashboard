import { describe, test, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react"
import { EditImageMetadataModal } from "./EditImageMetadataModal"
import { GlanceImage } from "@/server/Compute/types/image"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"

const MOCK_EXCLUDED_PROPERTIES = [
  "name",
  "tags",
  "visibility",
  "protected",
  "min_disk",
  "min_ram",
  "id",
  "status",
  "size",
  "checksum",
  "created_at",
  "updated_at",
  "disk_format",
  "container_format",
  "file",
  "schema",
  "self",
  "owner",
]

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      compute: {
        getImageMetadataExcludedProperties: {
          useQuery: () => ({ data: MOCK_EXCLUDED_PROPERTIES }),
        },
      },
    },
  }
})

const renderMetadataModal = (
  isOpen = true,
  mockOnClose = vi.fn(),
  mockImage: GlanceImage,
  mockOnSave = vi.fn(),
  isLoading = false
) => {
  return render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditImageMetadataModal
          image={mockImage}
          isOpen={isOpen}
          isLoading={isLoading}
          canEdit={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </PortalProvider>
    </I18nProvider>
  )
}

describe("EditImageMetadataModal", () => {
  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockImage: GlanceImage = {
    id: "test-image",
    name: "Test Image",
    custom_property: "custom_value",
    another_property: "another_value",
  } as GlanceImage

  // ── Visibility ──────────────────────────────────────────────────────────────

  test("renders when isOpen is true", () => {
    renderMetadataModal(true, vi.fn(), mockImage)
    expect(screen.getByText("Edit Metadata")).toBeInTheDocument()
  })

  test("does not render when isOpen is false", () => {
    renderMetadataModal(false, vi.fn(), mockImage)
    expect(screen.queryByText("Edit Metadata")).not.toBeInTheDocument()
  })

  // ── Metadata display ────────────────────────────────────────────────────────

  test("displays custom metadata properties and excludes system properties", () => {
    renderMetadataModal(true, vi.fn(), mockImage)
    expect(screen.getByText("custom_property")).toBeInTheDocument()
    expect(screen.getByText("custom_value")).toBeInTheDocument()
    expect(screen.queryByText("name")).not.toBeInTheDocument()
    expect(screen.queryByText("Test Image")).not.toBeInTheDocument()
  })

  test("shows empty state when no custom metadata exists", () => {
    const emptyImage = { id: "test", name: "Test" } as GlanceImage
    renderMetadataModal(true, vi.fn(), emptyImage)
    expect(screen.getByText(/No custom metadata properties/i)).toBeInTheDocument()
  })

  // ── Add property ────────────────────────────────────────────────────────────

  test("adds new property successfully", async () => {
    const mockOnSave = vi.fn()
    renderMetadataModal(true, vi.fn(), mockImage, mockOnSave)

    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    const keyInput = screen.getByPlaceholderText("Property Key")
    const valueInput = screen.getByPlaceholderText("Value")

    fireEvent.change(keyInput, { target: { value: "new_key" } })
    fireEvent.change(valueInput, { target: { value: "new_value" } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("new_key")).toBeInTheDocument()
    })
  })

  test("cancels adding new property", () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))
    expect(screen.getByPlaceholderText("Property Key")).toBeInTheDocument()

    const discardButtons = screen.getAllByTitle(/Discard/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(discardButtons[0])

    expect(screen.queryByPlaceholderText("Property Key")).not.toBeInTheDocument()
  })

  // ── Edit & delete ───────────────────────────────────────────────────────────

  test("edits existing property", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    const editButtons = screen.getAllByTitle(/Edit/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(editButtons[0])

    const inputs = screen.getAllByDisplayValue("custom_value")
    fireEvent.change(inputs[0], { target: { value: "updated_value" } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("updated_value")).toBeInTheDocument()
    })
  })

  test("deletes property", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    expect(screen.getByText("custom_property")).toBeInTheDocument()

    const deleteButtons = screen.getAllByTitle(/Delete/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText("custom_property")).not.toBeInTheDocument()
    })
  })

  // ── Save & cancel ───────────────────────────────────────────────────────────

  test("calls onSave with only changed metadata when Save Changes is clicked", async () => {
    const mockOnSave = vi.fn().mockResolvedValue(true)
    renderMetadataModal(true, vi.fn(), mockImage, mockOnSave)

    const deleteButtons = screen.getAllByTitle(/Delete/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(deleteButtons[0])

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ custom_property: null }))
    })
  })

  test("calls onClose when Cancel button is clicked", () => {
    const mockOnClose = vi.fn()
    renderMetadataModal(true, mockOnClose, mockImage)

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  test("trims whitespace from key and value when saving", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    const keyInput = screen.getByPlaceholderText("Property Key")
    const valueInput = screen.getByPlaceholderText("Value")

    fireEvent.change(keyInput, { target: { value: "  trimmed_key  " } })
    fireEvent.change(valueInput, { target: { value: "  trimmed_value  " } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("trimmed_key")).toBeInTheDocument()
      expect(screen.getByText("trimmed_value")).toBeInTheDocument()
    })
  })

  // ── Loading state ───────────────────────────────────────────────────────────

  test("shows loading spinner when isLoading is true", () => {
    renderMetadataModal(true, vi.fn(), mockImage, vi.fn(), true)
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })
})
