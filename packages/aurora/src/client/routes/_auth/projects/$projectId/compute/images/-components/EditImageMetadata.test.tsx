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
  return { ...actual }
})

const makeMockClient = () =>
  ({
    compute: {
      getImageMetadataExcludedProperties: {
        query: vi.fn().mockResolvedValue(MOCK_EXCLUDED_PROPERTIES),
      },
      updateImage: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  }) as unknown as import("@/client/trpcClient").TrpcClient

const renderMetadataModal = (
  isOpen = true,
  mockOnClose = vi.fn(),
  mockImage: GlanceImage,
  client = makeMockClient()
) => {
  const result = render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditImageMetadataModal
          client={client}
          image={mockImage}
          isOpen={isOpen}
          canEdit={true}
          onClose={mockOnClose}
          projectId="test-project"
        />
      </PortalProvider>
    </I18nProvider>
  )
  return { ...result, client }
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

  test("displays custom metadata properties and excludes system properties", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)
    await waitFor(() => {
      expect(screen.getByText("custom_property")).toBeInTheDocument()
    })
    expect(screen.getByText("custom_value")).toBeInTheDocument()
    expect(screen.queryByText("name")).not.toBeInTheDocument()
    expect(screen.queryByText("Test Image")).not.toBeInTheDocument()
  })

  test("shows empty state when no custom metadata exists", async () => {
    const emptyImage = { id: "test", name: "Test" } as GlanceImage
    renderMetadataModal(true, vi.fn(), emptyImage)
    await waitFor(() => {
      expect(screen.getByText(/No custom metadata properties/i)).toBeInTheDocument()
    })
  })

  // ── Add property ────────────────────────────────────────────────────────────

  test("adds new property successfully", async () => {
    const { client } = renderMetadataModal(true, vi.fn(), mockImage)

    await waitFor(() => expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    const inputs = screen.getAllByRole("textbox")
    const keyInput = inputs[0]
    const valueInput = inputs[1]

    fireEvent.change(keyInput, { target: { value: "new_key" } })
    fireEvent.change(valueInput, { target: { value: "new_value" } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(client.compute.updateImage.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: [{ op: "add", path: "/new_key", value: "new_value" }],
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText("new_key")).toBeInTheDocument()
    })
  })

  test("cancels adding new property", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    await waitFor(() => expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    const inputsBefore = screen.getAllByRole("textbox")
    expect(inputsBefore.length).toBeGreaterThan(0)

    const discardButtons = screen.getAllByTitle(/Discard/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(discardButtons[0])

    await waitFor(() => {
      const inputsAfter = screen.queryAllByRole("textbox")
      expect(inputsAfter.length).toBe(0)
    })
  })

  // ── Edit & delete ───────────────────────────────────────────────────────────

  test("edits existing property", async () => {
    const { client } = renderMetadataModal(true, vi.fn(), mockImage)

    await waitFor(() => expect(screen.getByText("custom_property")).toBeInTheDocument())
    // A-Z sort: another_property comes first, custom_property second
    const editButtons = screen.getAllByTitle(/Edit/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(editButtons[1])

    const inputs = screen.getAllByDisplayValue("custom_value")
    fireEvent.change(inputs[0], { target: { value: "updated_value" } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(client.compute.updateImage.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: [{ op: "replace", path: "/custom_property", value: "updated_value" }],
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByText("updated_value")).toBeInTheDocument()
    })
  })

  test("deletes property", async () => {
    const { client } = renderMetadataModal(true, vi.fn(), mockImage)

    await waitFor(() => expect(screen.getByText("custom_property")).toBeInTheDocument())

    // A-Z sort: another_property first, custom_property second
    const deleteButtons = screen.getAllByTitle(/Delete/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(deleteButtons[1])

    await waitFor(() => {
      expect(client.compute.updateImage.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ operations: [{ op: "remove", path: "/custom_property" }] })
      )
    })
    await waitFor(() => {
      expect(screen.queryByText("custom_property")).not.toBeInTheDocument()
    })
  })

  // ── Close ───────────────────────────────────────────────────────────────────

  test("calls onClose when Close button is clicked", async () => {
    const mockOnClose = vi.fn()
    renderMetadataModal(true, mockOnClose, mockImage)

    await waitFor(() => expect(screen.getByText("custom_property")).toBeInTheDocument())
    const closeButton = screen
      .getAllByRole("button", { name: /Close/i })
      .find((el) => el.textContent?.trim() === "Close")
    fireEvent.click(closeButton!)
    expect(mockOnClose).toHaveBeenCalled()
  })

  test("trims whitespace from key and value when saving", async () => {
    renderMetadataModal(true, vi.fn(), mockImage)

    await waitFor(() => expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    const inputs = screen.getAllByRole("textbox")
    const keyInput = inputs[0]
    const valueInput = inputs[1]

    fireEvent.change(keyInput, { target: { value: "  trimmed_key  " } })
    fireEvent.change(valueInput, { target: { value: "  trimmed_value  " } })

    const saveButtons = screen.getAllByTitle(/Save/i).filter((el) => el.tagName.toLowerCase() === "button")
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(screen.getByText("trimmed_key")).toBeInTheDocument()
      expect(screen.getByText("trimmed_value")).toBeInTheDocument()
    })
  })
})
