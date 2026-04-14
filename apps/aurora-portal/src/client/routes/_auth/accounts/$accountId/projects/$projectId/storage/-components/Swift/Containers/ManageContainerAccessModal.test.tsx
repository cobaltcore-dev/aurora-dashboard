import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ManageContainerAccessModal } from "./ManageContainerAccessModal"
import type { ContainerSummary, ContainerInfo } from "@/server/Storage/types/swift"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidateContainerMetadata = vi.fn()
const mockInvalidateListContainers = vi.fn()

let metadataLoading = false
let metadataError: { message: string } | null = null
let mockContainerInfo: Partial<ContainerInfo> | undefined = undefined
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
  count: 5,
  bytes: 1024,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const makeContainerInfo = (overrides: Partial<ContainerInfo> = {}): Partial<ContainerInfo> => ({
  read: "",
  write: "",
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
        <ManageContainerAccessModal
          isOpen={isOpen}
          container={container}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ManageContainerAccessModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    metadataLoading = false
    metadataError = null
    mockContainerInfo = makeContainerInfo()
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
      expect(screen.queryByText(/Access Control for container/i)).not.toBeInTheDocument()
    })

    test("does not render when container is null", () => {
      renderModal({ container: null })
      expect(screen.queryByText(/Access Control for container/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and container is set", () => {
      renderModal()
      expect(screen.getByText("my-container")).toBeInTheDocument()
    })

    test("renders modal title with container name", () => {
      renderModal({ container: makeContainer({ name: "special-container" }) })
      expect(screen.getByText("special-container")).toBeInTheDocument()
    })

    test("renders info message about ACL entries", () => {
      renderModal()
      expect(screen.getByText(/ACL entries control who can read from or write to this container/i)).toBeInTheDocument()
    })

    test("renders reference panel with ACL examples", () => {
      renderModal()
      expect(screen.getByText(/Entries in ACLs are comma-separated/i)).toBeInTheDocument()
      expect(screen.getByText(".r:*")).toBeInTheDocument()
      expect(screen.getByText(".rlistings")).toBeInTheDocument()
      expect(screen.getByText("PROJECT_ID:USER_ID")).toBeInTheDocument()
      expect(screen.getByText("PROJECT_ID:*")).toBeInTheDocument()
      expect(screen.getByText("*:USER_ID")).toBeInTheDocument()
    })

    test("renders documentation link", () => {
      renderModal()
      const link = screen.getByRole("link", { name: /documentation/i })
      expect(link).toHaveAttribute("href", "https://docs.openstack.org/swift/latest/overview_acl.html")
      expect(link).toHaveAttribute("target", "_blank")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Loading state", () => {
    test("shows loading spinner while fetching ACLs", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByText(/Loading ACLs/i)).toBeInTheDocument()
    })

    test("Save button is disabled while loading", () => {
      metadataLoading = true
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("renders ACL inputs once loading finishes", () => {
      metadataLoading = false
      renderModal()
      expect(screen.getByText(/Read ACLs/i)).toBeInTheDocument()
      expect(screen.getByText(/Write ACLs/i)).toBeInTheDocument()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Error state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Error state", () => {
    test("shows error message when metadata query fails", () => {
      metadataError = { message: "Network error" }
      renderModal()
      expect(screen.getByText(/Failed to load container ACLs/i)).toBeInTheDocument()
    })

    test("Save button is disabled when metadata query fails", () => {
      metadataError = { message: "Network error" }
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Form population
  // ──────────────────────────────────────────────────────────────────────────

  describe("Form population", () => {
    test("populates Read ACLs textarea from loaded metadata", () => {
      mockContainerInfo = makeContainerInfo({ read: "AUTH_project1:user1" })
      renderModal()
      const textareas = screen.getAllByRole("textbox")
      const readTextarea = textareas.find((el) => (el as HTMLTextAreaElement).value === "AUTH_project1:user1")
      expect(readTextarea).toBeInTheDocument()
    })

    test("populates Write ACLs textarea from loaded metadata", () => {
      mockContainerInfo = makeContainerInfo({ write: "AUTH_project1:*" })
      renderModal()
      const textareas = screen.getAllByRole("textbox")
      const writeTextarea = textareas.find((el) => (el as HTMLTextAreaElement).value === "AUTH_project1:*")
      expect(writeTextarea).toBeInTheDocument()
    })

    test("renders empty textareas when no ACLs are set", () => {
      mockContainerInfo = makeContainerInfo({ read: "", write: "" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      expect(textareas.every((ta) => ta.value === "")).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Public Read Access checkbox
  // ──────────────────────────────────────────────────────────────────────────

  describe("Public Read Access checkbox", () => {
    test("checkbox is checked when read ACL contains .r:* and .rlistings", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      renderModal()
      expect(screen.getByLabelText(/Public Read Access/i)).toBeChecked()
    })

    test("checkbox is unchecked when read ACL is empty", () => {
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      expect(screen.getByLabelText(/Public Read Access/i)).not.toBeChecked()
    })

    test("checkbox is unchecked when read ACL is set but not public", () => {
      mockContainerInfo = makeContainerInfo({ read: "AUTH_project1:user1" })
      renderModal()
      expect(screen.getByLabelText(/Public Read Access/i)).not.toBeChecked()
    })

    test("checking the checkbox adds .r:* and .rlistings to Read ACLs textarea", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      await user.click(screen.getByLabelText(/Public Read Access/i))
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value.includes(".r:*"))
      expect(readTextarea?.value).toContain(".r:*")
      expect(readTextarea?.value).toContain(".rlistings")
    })

    test("unchecking the checkbox removes .r:* and .rlistings from Read ACLs textarea", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      renderModal()
      await user.click(screen.getByLabelText(/Public Read Access/i))
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => !ta.value.includes(".r:*"))
      expect(readTextarea?.value ?? "").not.toContain(".r:*")
    })

    test("checking the checkbox disables the Read ACLs textarea", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      await user.click(screen.getByLabelText(/Public Read Access/i))
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value.includes(".r:*"))
      expect(readTextarea).toBeDisabled()
    })

    test("Read ACLs textarea is disabled on load when container already has public read", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value.includes(".r:*"))
      expect(readTextarea).toBeDisabled()
    })

    test("typing in Read ACLs updates the Public Read checkbox state", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas[0]
      await user.type(readTextarea, ".r:*,.rlistings")
      expect(screen.getByLabelText(/Public Read Access/i)).toBeChecked()
    })

    test("preserving extra entries when toggling public read off", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*,.rlistings,AUTH_project:user1" })
      renderModal()
      await user.click(screen.getByLabelText(/Public Read Access/i))
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value.includes("AUTH_project:user1"))
      expect(readTextarea?.value).toContain("AUTH_project:user1")
      expect(readTextarea?.value).not.toContain(".r:*")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ACL preview toggle
  // ──────────────────────────────────────────────────────────────────────────

  describe("ACL preview toggle", () => {
    test("preview toggle button is not rendered when both ACL fields are empty", () => {
      mockContainerInfo = makeContainerInfo({ read: "", write: "" })
      renderModal()
      expect(screen.queryByRole("button", { name: /Show ACLs Preview/i })).not.toBeInTheDocument()
    })

    test("preview toggle button is rendered when Read ACL has content", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      expect(screen.getByRole("button", { name: /Show ACLs Preview/i })).toBeInTheDocument()
    })

    test("preview toggle button is rendered when Write ACL has content", () => {
      mockContainerInfo = makeContainerInfo({ write: "AUTH_project:*" })
      renderModal()
      expect(screen.getByRole("button", { name: /Show ACLs Preview/i })).toBeInTheDocument()
    })

    test("parsed ACL preview is hidden by default", () => {
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      expect(screen.queryByText(/valid token required/i)).not.toBeInTheDocument()
    })

    test("clicking Show ACLs Preview reveals the parsed preview", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText(/valid token required/i)).toBeInTheDocument()
    })

    test("button label changes to 'Hide ACLs Preview' when preview is open", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByRole("button", { name: /Hide ACLs Preview/i })).toBeInTheDocument()
    })

    test("clicking Hide ACLs Preview collapses the preview", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      await user.click(screen.getByRole("button", { name: /Hide ACLs Preview/i }))
      expect(screen.queryByText(/valid token required/i)).not.toBeInTheDocument()
    })

    test("preview button disappears and preview collapses when ACL fields are cleared", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText(/valid token required/i)).toBeInTheDocument()

      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value.includes(".r:*"))!
      await user.clear(readTextarea)

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /ACLs Preview/i })).not.toBeInTheDocument()
        expect(screen.queryByText(/valid token required/i)).not.toBeInTheDocument()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Parsed ACL preview content
  // ──────────────────────────────────────────────────────────────────────────

  describe("Parsed ACL preview content", () => {
    test("shows 'ANY referrer' label for .r:* entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("ANY referrer")).toBeInTheDocument()
    })

    test("shows 'Listing access' label for .rlistings entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".rlistings" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("Listing access")).toBeInTheDocument()
    })

    test("shows correct label for PROJECT_ID:USER_ID entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "proj123:user456" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("Referrer user456 for project proj123")).toBeInTheDocument()
    })

    test("shows correct label for PROJECT_ID:* entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "proj123:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("All referrers from project proj123")).toBeInTheDocument()
    })

    test("shows correct label for *:USER_ID entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "*:user456" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("Referrer user456 (any project)")).toBeInTheDocument()
    })

    test("shows 'Specific referrer' label for .r:<referrer> entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:example.com" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("Specific referrer: example.com")).toBeInTheDocument()
    })

    test("shows 'Denied referrer' label for .r:-<referrer> entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:-badhost.com" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText("Denied referrer: badhost.com")).toBeInTheDocument()
    })

    test("shows 'valid token required: false' for .r:* entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText(/valid token required: false/i)).toBeInTheDocument()
    })

    test("shows 'valid token required: true' for PROJECT_ID:USER_ID entry", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "proj123:user456" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText(/valid token required: true/i)).toBeInTheDocument()
    })

    test("renders both Read ACLs and Write ACLs sections in preview", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*", write: "proj123:*" })
      renderModal()
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      const previewHeadings = screen.getAllByText(/Read ACLs|Write ACLs/)
      expect(previewHeadings.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Submission
  // ──────────────────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("calls mutate with correct container name and ACL values", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "", write: "" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ container: "my-container", read: ".r:*" }))
    })

    test("sends empty string for read when ACL is cleared (to remove existing ACL)", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "AUTH_project:user1", write: "" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const readTextarea = textareas.find((ta) => ta.value === "AUTH_project:user1")!
      await user.clear(readTextarea)
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ container: "my-container", read: "", write: "" })
      )
    })

    test("sends empty string for write when ACL is cleared (to remove existing ACL)", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "", write: "AUTH_project:*" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      const writeTextarea = textareas.find((ta) => ta.value === "AUTH_project:*")!
      await user.clear(writeTextarea)
      await user.click(screen.getByRole("button", { name: /Save/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ container: "my-container", read: "", write: "" })
      )
    })

    test("calls onSuccess with container name after successful mutation", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: "", write: "" })
      renderModal({ onSuccess })
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("my-container")
      })
    })

    test("invalidates getContainerMetadata cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateContainerMetadata).toHaveBeenCalledWith({ container: "my-container" })
      })
    })

    test("invalidates listContainers cache on success", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(mockInvalidateListContainers).toHaveBeenCalled()
      })
    })

    test("closes modal after successful mutation", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal({ onClose })
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
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
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
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
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled()
      })
    })

    test("shows inline mutation error message after failed save", async () => {
      mutationError = "Permission denied"
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo()
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")
      await user.click(screen.getByRole("button", { name: /Save/i }))
      await waitFor(() => {
        expect(screen.getByText(/Failed to update ACLs/i)).toBeInTheDocument()
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
            <ManageContainerAccessModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      const user = userEvent.setup()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      await user.type(textareas[0], ".r:*")

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageContainerAccessModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageContainerAccessModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        const reopenedTextareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
        expect(reopenedTextareas.every((ta) => ta.value === "")).toBe(true)
      })
    })

    test("preview is hidden after modal is closed and reopened", async () => {
      const user = userEvent.setup()
      mockContainerInfo = makeContainerInfo({ read: ".r:*" })
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageContainerAccessModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await user.click(screen.getByRole("button", { name: /Show ACLs Preview/i }))
      expect(screen.getByText(/valid token required/i)).toBeInTheDocument()

      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageContainerAccessModal isOpen={false} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageContainerAccessModal isOpen={true} container={makeContainer()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await waitFor(() => {
        expect(screen.queryByText(/valid token required/i)).not.toBeInTheDocument()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Busy state
  // ──────────────────────────────────────────────────────────────────────────

  describe("Busy state", () => {
    test("Save button is disabled while mutation is pending", () => {
      mutationIsPending = true
      renderModal()
      expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled()
    })

    test("Write ACLs textarea is disabled while mutation is pending", () => {
      mutationIsPending = true
      mockContainerInfo = makeContainerInfo({ read: "", write: "" })
      renderModal()
      const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[]
      expect(textareas.every((ta) => ta.disabled)).toBe(true)
    })

    test("Public Read Access checkbox is disabled while mutation is pending", () => {
      mutationIsPending = true
      renderModal()
      expect(screen.getByLabelText(/Public Read Access/i)).toBeDisabled()
    })
  })
})
