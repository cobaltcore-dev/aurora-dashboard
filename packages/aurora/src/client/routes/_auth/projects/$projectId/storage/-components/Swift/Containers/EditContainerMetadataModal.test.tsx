import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EditContainerMetadataModal } from "./EditContainerMetadataModal"
import type { ContainerSummary, ContainerInfo } from "@/server/Storage/types/swift"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

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
  hasTempUrlKey: false,
  hasSyncKey: false,
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

const getIconButton = (title: string | RegExp) =>
  screen.getAllByTitle(title).find((el) => el.tagName.toLowerCase() === "button") as HTMLElement

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

  // ── Visibility ──────────────────────────────────────────────────────────────

  test("renders nothing when closed or container is null", () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText(/Container:/i)).not.toBeInTheDocument()

    renderModal({ isOpen: true, container: null })
    expect(screen.queryByText(/Container:/i)).not.toBeInTheDocument()
  })

  test("renders modal with container name when open", () => {
    renderModal()
    expect(screen.getByText("my-container")).toBeInTheDocument()
  })

  // ── Loading & error states ──────────────────────────────────────────────────

  test("shows loading spinner while fetching metadata", () => {
    metadataLoading = true
    renderModal()
    expect(screen.getByText(/Loading container properties/i)).toBeInTheDocument()
  })

  test("shows error message when metadata fetch fails", () => {
    metadataError = { message: "Not found" }
    renderModal()
    expect(screen.getByText(/Failed to load container properties/i)).toBeInTheDocument()
    expect(screen.getByText(/Not found/)).toBeInTheDocument()
  })

  // ── Custom metadata validation ──────────────────────────────────────────────

  test("validates metadata key is required", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText(/Key is required/i)).toBeInTheDocument()
    })
  })

  test("validates metadata key contains only valid characters", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "invalid key")
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText(/Key contains invalid characters/i)).toBeInTheDocument()
    })
  })

  test("validates metadata key has at least one alphanumeric character", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "----")
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText(/Key must contain at least one alphanumeric character/i)).toBeInTheDocument()
    })
  })

  test("accepts valid metadata key with hyphens", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "my-key-1")
    await user.type(screen.getByPlaceholderText(/Value/i), "val")
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText("my-key-1")).toBeInTheDocument()
    })
  })

  // ── Metadata CRUD ───────────────────────────────────────────────────────────

  test("adds new metadata entry", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "author")
    await user.type(screen.getByPlaceholderText(/Value/i), "Alice")
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText("author")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
  })

  test("edits existing metadata entry", async () => {
    mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
    const user = userEvent.setup()
    renderModal()
    await user.click(getIconButton(/Edit/i))
    const valueInputs = screen.getAllByRole("textbox").filter((i) => i.getAttribute("value") === "Alice")
    await user.clear(valueInputs[0])
    await user.type(valueInputs[0], "Bob")
    await user.click(getIconButton(/Save/i))
    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })
  })

  test("deletes metadata entry", async () => {
    mockContainerInfo = makeContainerInfo({ metadata: { author: "Alice" } })
    const user = userEvent.setup()
    renderModal()
    await user.click(getIconButton(/Delete/i))
    await waitFor(() => {
      expect(screen.queryByText("author")).not.toBeInTheDocument()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })
  })

  test("discards unsaved new entry", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "discard-me")
    await user.click(getIconButton(/Discard/i))
    await waitFor(() => {
      expect(screen.queryByText("discard-me")).not.toBeInTheDocument()
      expect(screen.getByText(/No custom metadata/i)).toBeInTheDocument()
    })
  })

  // ── Submission ──────────────────────────────────────────────────────────────

  test("submits metadata changes with correct parameters", async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole("button", { name: /Add Property/i }))
    await user.type(screen.getByPlaceholderText(/Property Key/i), "owner")
    await user.type(screen.getByPlaceholderText(/Value/i), "Alice")
    await user.click(getIconButton(/Save/i))
    await user.click(getModalSaveButton())
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: mockProjectId,
        container: "my-container",
        metadata: expect.objectContaining({ owner: "Alice" }),
      })
    )
  })

  test("calls onSuccess and invalidates cache after successful mutation", async () => {
    const onSuccess = vi.fn()
    mockContainerInfo = makeContainerInfo({ metadata: { k: "v" } })
    const user = userEvent.setup()
    renderModal({ onSuccess })
    await user.click(getIconButton(/Delete/i))
    await user.click(getModalSaveButton())
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("my-container")
      expect(mockInvalidateContainerMetadata).toHaveBeenCalled()
      expect(mockInvalidateListContainers).toHaveBeenCalled()
    })
  })

  test("shows error message on mutation failure", async () => {
    mutationError = "Forbidden"
    mockContainerInfo = makeContainerInfo({ metadata: { k: "v" } })
    const user = userEvent.setup()
    renderModal()
    await user.click(getIconButton(/Delete/i))
    await user.click(getModalSaveButton())
    await waitFor(() => {
      expect(screen.getByText(/Failed to update container/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
  })

  // ── Modal lifecycle ─────────────────────────────────────────────────────────

  test("closes modal on cancel", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })
    await user.click(screen.getByRole("button", { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
