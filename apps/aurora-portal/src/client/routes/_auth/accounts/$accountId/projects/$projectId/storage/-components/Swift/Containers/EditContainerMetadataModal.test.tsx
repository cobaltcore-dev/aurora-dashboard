import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EditContainerMetadataModal } from "./EditContainerMetadataModal"
import type { ContainerSummary, ContainerInfo } from "@/server/Storage/types/swift"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidateContainerMetadata = vi.fn()
const mockInvalidateListContainers = vi.fn()

let metadataLoading = false
let metadataError: { message: string } | null = null
let mockContainerInfo: ContainerInfo | undefined = undefined
let mockPublicUrl: string | null = null
let mockContainerList: { name: string }[] = []
let mutationError: string | null = null
let mutationIsPending = false

let capturedMutationOptions: {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
} = {}

const mockMutate = vi.fn().mockImplementation(() => {
  if (mutationError) {
    capturedMutationOptions.onError?.({ message: mutationError })
  } else {
    capturedMutationOptions.onSuccess?.()
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          getContainerMetadata: { invalidate: mockInvalidateContainerMetadata },
          listContainers: { invalidate: mockInvalidateListContainers },
        },
      },
    }),
    storage: {
      swift: {
        getContainerMetadata: {
          useQuery: () => ({
            data: mockContainerInfo,
            isLoading: metadataLoading,
            isError: metadataError !== null,
            error: metadataError,
          }),
        },
        getContainerPublicUrl: {
          useQuery: () => ({
            data: mockPublicUrl,
          }),
        },
        listContainers: {
          useQuery: () => ({
            data: mockContainerList,
          }),
        },
        updateContainerMetadata: {
          useMutation: (options: typeof capturedMutationOptions) => {
            capturedMutationOptions = options ?? {}
            return {
              mutate: mockMutate,
              reset: mockReset,
              isPending: mutationIsPending,
              isError: mutationError !== null && !mutationIsPending,
              error: mutationError ? { message: mutationError } : null,
            }
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeContainer = (overrides: Partial<ContainerSummary> = {}): ContainerSummary => ({
  name: "my-container",
  count: 10,
  bytes: 1048576,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const makeContainerInfo = (overrides: Partial<ContainerInfo> = {}): ContainerInfo => ({
  objectCount: 10,
  bytesUsed: 1048576,
  metadata: {},
  ...overrides,
})

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  container = makeContainer(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
}: {
  isOpen?: boolean
  container?: ContainerSummary | null
  onClose?: () => void
  onSuccess?: (name: string) => void
  onError?: (name: string, error: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EditContainerMetadataModal
          isOpen={isOpen}
          container={container}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Juno icon buttons render an SVG with a <title> child, which makes getByTitle
// match both the <button title="X"> and the inner SVG <title>X</title>.
// This helper returns only the actual button element.
const getIconButton = (title: string | RegExp) =>
  screen.getAllByTitle(title).find((el) => el.tagName.toLowerCase() === "button") as HTMLElement

// The modal footer "Save" button has visible text "Save" and default size.
// The inline row save button is icon-only (small size, empty text content).
// Distinguish by the text node directly inside the button.
const getModalSaveButton = () =>
  screen
    .getAllByRole("button", { name: /Save/i })
    .find((el) =>
      Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() === "Save")
    ) as HTMLElement

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EditContainerMetadataModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    metadataLoading = false
    metadataError = null
    mockContainerInfo = makeContainerInfo()
    mockPublicUrl = null
    mockContainerList = []
    mutationError = null
    mutationIsPending = false
    capturedMutationOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Visibility
  // ──────────────────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Container:/i)).not.toBeInTheDocument()
    })

    test("does not render when container is null", () => {
      renderModal({ container: null })
      expect(screen.queryByText(/Container:/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and container is set", () => {
      renderModal()
      expect(screen.getByText("my-container")).toBeInTheDocument()
    })

    test("renders modal title with container name", () => {
      renderModal({ container: makeContainer({ name: "special-container" }) })
      expect(screen.getByText("special-container")).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Loading state", () => {
    test("shows loading spinner while fetching container properties", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByText(/Loading container properties/i)).toBeInTheDocument()
    })

    test("Save button is disabled while loading", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("renders content once loading finishes", () => {
      metadataLoading = false
      renderModal()
      expect(screen.getByLabelText(/Object count$/i)).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Read-only stats
  // ──────────────────────────────────────────────────────────────────────────

  describe("Read-only stats", () => {
    test("renders object count from container summary", () => {
      renderModal({ container: makeContainer({ count: 42 }) })
      expect(screen.getByDisplayValue("42")).toBeInTheDocument()
    })

    test("renders total size from ContainerInfo when available", () => {
      mockContainerInfo = makeContainerInfo({ bytesUsed: 2048 })
      renderModal()
      expect(screen.getByDisplayValue(/2,048 B/)).toBeInTheDocument()
    })

    test("falls back to container.bytes when ContainerInfo is not yet loaded", () => {
      mockContainerInfo = undefined
      renderModal({ container: makeContainer({ bytes: 4096 }) })
      expect(screen.getByDisplayValue(/4,096 B/)).toBeInTheDocument()
    })

    test("object count and total size fields are read-only", () => {
      renderModal()
      const inputs = screen.getAllByRole("textbox")
      const objectCountInput = inputs.find((i) => i.getAttribute("value") === "10")
      expect(objectCountInput).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Quota fields
  // ──────────────────────────────────────────────────────────────────────────

  describe("Quota fields", () => {
    test("renders quota fields with empty values when not set", () => {
      renderModal()
      expect(screen.getByLabelText(/Object count quota/i)).toHaveValue("")
      expect(screen.getByLabelText(/Total size quota/i)).toHaveValue("")
    })

    test("populates quota fields from ContainerInfo", () => {
      mockContainerInfo = makeContainerInfo({ quotaCount: 500, quotaBytes: 1073741824 })
      renderModal()
      expect(screen.getByLabelText(/Object count quota/i)).toHaveValue("500")
      expect(screen.getByLabelText(/Total size quota/i)).toHaveValue("1073741824")
    })

    test("shows validation error for negative quota-bytes", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.clear(screen.getByLabelText(/Total size quota/i))
      await user.type(screen.getByLabelText(/Total size quota/i), "-1")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(screen.getByText(/Must be a non-negative integer/i)).toBeInTheDocument()
      })
    })

    test("shows validation error for non-numeric quota-count", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Object count quota/i), "abc")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(screen.getByText(/Must be a non-negative integer/i)).toBeInTheDocument()
      })
    })

    test("clears quota-bytes error when field changes", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText(/Total size quota/i), "-5")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => expect(screen.getByText(/Must be a non-negative integer/i)).toBeInTheDocument())
      await user.clear(screen.getByLabelText(/Total size quota/i))
      await user.type(screen.getByLabelText(/Total size quota/i), "100")
      await waitFor(() => {
        expect(screen.queryByText(/Must be a non-negative integer/i)).not.toBeInTheDocument()
      })
    })

    test("does not call mutate when quota validation fails", async () => {
      const user = userEvent.setup()
      // Load with a changed field so Save button is enabled
      mockContainerInfo = makeContainerInfo({ quotaBytes: 0 })
      renderModal()
      await user.clear(screen.getByLabelText(/Total size quota/i))
      await user.type(screen.getByLabelText(/Total size quota/i), "-1")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Public URL
  // ──────────────────────────────────────────────────────────────────────────

  describe("Public URL section", () => {
    test("does not render public URL section when publicUrl is null", () => {
      mockPublicUrl = null
      renderModal()
      expect(screen.queryByText(/URL for public access/i)).not.toBeInTheDocument()
    })

    test("renders public URL input when publicUrl is available", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      mockPublicUrl = "https://swift.example.com/v1/AUTH_test/my-container/"
      renderModal()
      expect(screen.getByText(/URL for public access/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue("https://swift.example.com/v1/AUTH_test/my-container/")).toBeInTheDocument()
    })

    test("renders Open in new tab link pointing to the public URL", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      mockPublicUrl = "https://swift.example.com/v1/AUTH_test/my-container/"
      renderModal()
      const link = screen.getByRole("link", { name: /Open in new tab/i })
      expect(link).toHaveAttribute("href", "https://swift.example.com/v1/AUTH_test/my-container/")
      expect(link).toHaveAttribute("target", "_blank")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Static website serving
  // ──────────────────────────────────────────────────────────────────────────

  describe("Static website serving", () => {
    test("shows info message when container does not have public read access", () => {
      mockContainerInfo = makeContainerInfo({ read: "AUTH_user1" })
      renderModal()
      expect(screen.getByText(/Public read access is not enabled/i)).toBeInTheDocument()
      expect(screen.getByText(/Manage Access/i)).toBeInTheDocument()
    })

    test("shows web-index and web-listings controls when container has public read access", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index when file name is/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Enable file listing/i)).toBeInTheDocument()
    })

    test("web-index checkbox is unchecked when web-index metadata is not set", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings", metadata: {} })
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index when file name is/i)).not.toBeChecked()
    })

    test("web-index checkbox is checked when web-index metadata is set", () => {
      mockContainerInfo = makeContainerInfo({
        read: ".r:*,.rlistings",
        metadata: { "web-index": "index.html" },
      })
      renderModal()
      expect(screen.getByLabelText(/Serve objects as index when file name is/i)).toBeChecked()
    })

    test("checking web-index sets default value index.html in text input", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings", metadata: {} })
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index when file name is/i))
      const inputs = screen.getAllByRole("textbox")
      const webIndexInput = inputs.find((i) => i.getAttribute("placeholder") === "index.html")
      expect(webIndexInput).toHaveValue("index.html")
    })

    test("unchecking web-index clears the text input", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({
        read: ".r:*,.rlistings",
        metadata: { "web-index": "index.html" },
      })
      renderModal()
      await user.click(screen.getByLabelText(/Serve objects as index when file name is/i))
      const inputs = screen.getAllByRole("textbox")
      const webIndexInput = inputs.find((i) => i.getAttribute("placeholder") === "index.html")
      expect(webIndexInput).toHaveValue("")
    })

    test("web-listings checkbox is unchecked by default", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings", metadata: {} })
      renderModal()
      expect(screen.getByLabelText(/Enable file listing/i)).not.toBeChecked()
    })

    test("web-listings checkbox is checked when web-listings metadata is '1'", () => {
      mockContainerInfo = makeContainerInfo({
        read: ".r:*,.rlistings",
        metadata: { "web-listings": "1" },
      })
      renderModal()
      expect(screen.getByLabelText(/Enable file listing/i)).toBeChecked()
    })

    test("web-listings checkbox is checked when web-listings metadata is 'true'", () => {
      mockContainerInfo = makeContainerInfo({
        read: ".r:*,.rlistings",
        metadata: { "web-listings": "true" },
      })
      renderModal()
      expect(screen.getByLabelText(/Enable file listing/i)).toBeChecked()
    })

    test("renders tooltip for Enable file listing checkbox", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      renderModal()
      // Help icon acts as tooltip trigger
      expect(screen.getByLabelText(/Enable file listing/i)).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Object versioning
  // ──────────────────────────────────────────────────────────────────────────

  describe("Object versioning", () => {
    test("renders 'Store old object versions' checkbox when versioning is not configured", () => {
      mockContainerInfo = makeContainerInfo()
      renderModal()
      expect(screen.getByLabelText(/Store old object versions/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Store old object versions/i)).not.toBeChecked()
    })

    test("renders 'Versioning is enabled' when server-side versioning is active without location", () => {
      mockContainerInfo = makeContainerInfo({ versionsEnabled: true })
      renderModal()
      expect(screen.getByLabelText(/Versioning is enabled/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Versioning is enabled/i)).toBeChecked()
    })

    test("'Versioning is enabled' checkbox is disabled (read-only indicator)", () => {
      mockContainerInfo = makeContainerInfo({ versionsEnabled: true })
      renderModal()
      expect(screen.getByLabelText(/Versioning is enabled/i)).toBeDisabled()
    })

    test("renders container selector when versioning is enabled via versionsLocation", () => {
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeChecked()
    })

    test("renders container selector when versioning is enabled via historyLocation", () => {
      mockContainerInfo = makeContainerInfo({ historyLocation: "history-container" })
      renderModal()
      expect(screen.getByLabelText(/Store old object versions in container/i)).toBeInTheDocument()
    })

    test("checking 'Store old object versions' transitions to container selector", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions/i))
      await waitFor(() => {
        expect(screen.getByLabelText(/Store old object versions in container/i)).toBeInTheDocument()
      })
    })

    test("unchecking versioning checkbox clears the container selector", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await waitFor(() => {
        expect(screen.queryByLabelText(/Store old object versions in container/i)).not.toBeInTheDocument()
        expect(screen.getByLabelText(/Store old object versions/i)).not.toBeChecked()
      })
    })

    test("ComboBox shows search placeholder text", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions/i))
      await waitFor(() => {
        expect(screen.getByText(/Start typing to search for a container/i)).toBeInTheDocument()
      })
    })

    test("ComboBox filters containers based on input and excludes current container", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      mockContainerList = [{ name: "my-container" }, { name: "versions-container" }, { name: "other-container" }]
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions/i))
      const comboInput = await screen.findByPlaceholderText(/Type to search containers/i)
      await user.type(comboInput, "container")
      await waitFor(() => {
        expect(screen.getByText("versions-container")).toBeInTheDocument()
        expect(screen.getByText("other-container")).toBeInTheDocument()
        // current container is excluded
        expect(screen.queryByRole("option", { name: "my-container" })).not.toBeInTheDocument()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Custom metadata
  // ──────────────────────────────────────────────────────────────────────────

  describe("Custom metadata", () => {
    test("renders empty state message when no custom metadata exists", () => {
      mockContainerInfo = makeContainerInfo({ metadata: {} })
      renderModal()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })

    test("renders existing metadata entries", () => {
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice", project: "Aurora" } })
      renderModal()
      expect(screen.getByText("author")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("project")).toBeInTheDocument()
      expect(screen.getByText("Aurora")).toBeInTheDocument()
    })

    test("does not render reserved keys in the metadata table", () => {
      mockContainerInfo = makeContainerInfo({
        metadata: { "quota-bytes": "1000", "web-index": "index.html", author: "Alice" },
      })
      renderModal()
      expect(screen.queryByText("quota-bytes")).not.toBeInTheDocument()
      expect(screen.queryByText("web-index")).not.toBeInTheDocument()
      expect(screen.getByText("author")).toBeInTheDocument()
    })

    test("renders Add Property button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument()
    })

    test("clicking Add Property shows new row input fields", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(screen.getByPlaceholderText(/property_key/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Value/i)).toBeInTheDocument()
    })

    test("shows key required error when saving new entry with empty key", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/Key is required/i)).toBeInTheDocument()
      })
    })

    test("shows value required error when saving new entry with empty value", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "my-key")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/Value is required/i)).toBeInTheDocument()
      })
    })

    test("shows error when adding a reserved key", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "quota-bytes")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/This key is reserved and managed separately/i)).toBeInTheDocument()
      })
    })

    test("shows error when adding a duplicate key", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "author")
      await user.type(screen.getByPlaceholderText(/Value/i), "Bob")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText(/A property with this key already exists/i)).toBeInTheDocument()
      })
    })

    test("adds new metadata entry to table after valid save", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "new-key")
      await user.type(screen.getByPlaceholderText(/Value/i), "new-value")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText("new-key")).toBeInTheDocument()
        expect(screen.getByText("new-value")).toBeInTheDocument()
      })
    })

    test("Discard button cancels new entry without adding it", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "discard-me")
      await user.click(getIconButton(/Discard/i))
      await waitFor(() => {
        expect(screen.queryByText("discard-me")).not.toBeInTheDocument()
        expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
      })
    })

    test("Edit button shows edit inputs for existing entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Edit$/i))
      // Key and value become editable inputs
      expect(screen.getAllByRole("textbox").some((i) => i.getAttribute("value") === "author")).toBeTruthy()
    })

    test("can save edited metadata entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Edit$/i))
      const valueInputs = screen.getAllByRole("textbox").filter((i) => i.getAttribute("value") === "Alice")
      await user.clear(valueInputs[0])
      await user.type(valueInputs[0], "Bob")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByText("Bob")).toBeInTheDocument()
      })
    })

    test("Discard in edit mode restores original value", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Edit$/i))
      const valueInputs = screen.getAllByRole("textbox").filter((i) => i.getAttribute("value") === "Alice")
      await user.clear(valueInputs[0])
      await user.type(valueInputs[0], "Temp")
      await user.click(getIconButton(/Discard/i))
      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument()
      })
    })

    test("Delete button removes metadata entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Delete$/i))
      await waitFor(() => {
        expect(screen.queryByText("author")).not.toBeInTheDocument()
        expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
      })
    })

    test("Add Property button is disabled while editing an existing entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Edit$/i))
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeDisabled()
    })

    test("Add Property button is disabled while adding a new entry", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(screen.getByRole("button", { name: /Add Property/i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Save button disabled state (isUnchanged)
  // ──────────────────────────────────────────────────────────────────────────

  describe("Save button enabled state", () => {
    test("Save button is disabled when form is unchanged", () => {
      mockContainerInfo = makeContainerInfo()
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("Save button is enabled after quota-bytes is changed", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Save/i })).not.toBeDisabled()
      })
    })

    test("Save button is enabled after a new metadata entry is added", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "k")
      await user.type(screen.getByPlaceholderText(/Value/i), "v")
      await user.click(getIconButton(/^Save$/i))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Save/i })).not.toBeDisabled()
      })
    })

    test("Save button is disabled while an unsaved new entry row is open", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      expect(getModalSaveButton()).toBeDisabled()
    })

    test("Save button is disabled while an entry is being edited", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Edit$/i))
      expect(getModalSaveButton()).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Submission
  // ──────────────────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("calls mutate with quotaBytes when changed", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.type(screen.getByLabelText(/Total size quota/i), "2048")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ container: "my-container", quotaBytes: 2048 }))
    })

    test("calls mutate with quotaCount when changed", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.type(screen.getByLabelText(/Object count quota/i), "100")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ container: "my-container", quotaCount: 100 }))
    })

    test("calls mutate with new metadata entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Add Property/i }))
      await user.type(screen.getByPlaceholderText(/property_key/i), "owner")
      await user.type(screen.getByPlaceholderText(/Value/i), "Alice")
      await user.click(getIconButton(/^Save$/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ owner: "Alice" }) })
      )
    })

    test("calls mutate with removeMetadata for deleted entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
      renderModal()
      await user.click(getIconButton(/^Delete$/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ removeMetadata: expect.arrayContaining(["author"]) })
      )
    })

    test("calls mutate with removeVersionsLocation when versioning is disabled", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ versionsLocation: "versions-container" })
      renderModal()
      await user.click(screen.getByLabelText(/Store old object versions in container/i))
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ removeVersionsLocation: true }))
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal({ onSuccess })
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("invalidates getContainerMetadata cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateContainerMetadata).toHaveBeenCalledWith({ container: "my-container" })
      })
    })

    test("invalidates listContainers cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateListContainers).toHaveBeenCalled()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────────────────────────────────

  describe("Error handling", () => {
    test("calls onError with container name and error message on mutation failure", async () => {
      mutationError = "Internal Server Error"
      const onError = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal({ onError })
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("my-container", "Internal Server Error")
      })
    })

    test("does not close the modal on mutation failure", async () => {
      mutationError = "Server error"
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal({ onClose })
      await user.type(screen.getByLabelText(/Total size quota/i), "1000")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Cancel / close
  // ──────────────────────────────────────────────────────────────────────────

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("resets form state when modal is closed and reopened", async () => {
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <EditContainerMetadataModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      const user = userEvent.setup()
      await user.type(screen.getByLabelText(/Total size quota/i), "9999")
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <EditContainerMetadataModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <EditContainerMetadataModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        expect(screen.getByLabelText(/Total size quota/i)).toHaveValue("")
      })
    })
  })
})
