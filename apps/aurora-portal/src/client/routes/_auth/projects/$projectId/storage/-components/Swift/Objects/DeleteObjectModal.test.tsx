import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteObjectModal } from "./DeleteObjectModal"
import type { ObjectRow } from "./"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

let mockMutate = vi.fn()
let mockIsPending = false

// Metadata query state — controls what getObjectMetadata returns per test
let mockMetadata: {
  staticLargeObject?: boolean
  objectManifest?: string
} | null = {}
let mockMetadataLoading = false
let mockMetadataError: { message: string } | null = null

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: { swift: { listObjects: { invalidate: vi.fn() } } },
    }),
    storage: {
      swift: {
        deleteObject: {
          useMutation: vi.fn(
            ({
              onSuccess,
              onError,
              onSettled,
            }: {
              onSuccess?: () => void
              onError?: (err: { message: string }) => void
              onSettled?: () => void
            }) => ({
              mutate: (input: unknown) => mockMutate(input, { onSuccess, onError, onSettled }),
              isPending: mockIsPending,
              reset: vi.fn(),
            })
          ),
        },
        getObjectMetadata: {
          useQuery: vi.fn(() => ({
            data: mockMetadata,
            isLoading: mockMetadataLoading,
            error: mockMetadataError,
          })),
        },
      },
    },
  },
}))

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({
      accountId: "test-account",
      projectId: "test-project",
      provider: "swift",
      containerName: "test-container",
    })),
  }
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeObject = (overrides: Partial<ObjectRow> = {}): ObjectRow => ({
  kind: "object",
  name: "folder/report.pdf",
  displayName: "report.pdf",
  bytes: 1024,
  last_modified: "2024-03-01T08:00:00.000000",
  content_type: "application/pdf",
  ...overrides,
})

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  object = makeObject(),
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteObjectModal isOpen={isOpen} object={object} onClose={onClose} onSuccess={onSuccess} onError={onError} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteObjectModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockMutate = vi.fn()
    mockIsPending = false
    mockMetadata = {} // regular object by default
    mockMetadataLoading = false
    mockMetadataError = null
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    it("renders when isOpen is true and object is provided", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not render when object is null", () => {
      renderModal({ object: null as unknown as ObjectRow })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  // ── Metadata loading ──────────────────────────────────────────────────────

  describe("Metadata loading", () => {
    it("shows loading spinner while metadata is being fetched", () => {
      mockMetadataLoading = true
      mockMetadata = null
      renderModal()
      expect(screen.getByText(/Loading object info/i)).toBeInTheDocument()
    })

    it("disables confirm button while metadata is loading", () => {
      mockMetadataLoading = true
      mockMetadata = null
      renderModal()
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeDisabled()
    })

    it("shows error message when metadata fetch fails", () => {
      mockMetadataError = { message: "Forbidden" }
      mockMetadata = null
      renderModal()
      expect(screen.getByText(/Failed to load object metadata/i)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/i)).toBeInTheDocument()
    })
  })

  // ── Regular object (delete variant) ──────────────────────────────────────

  describe("Regular object", () => {
    it("shows Delete object title", () => {
      renderModal()
      expect(screen.getByText(/Delete object:/i)).toBeInTheDocument()
    })

    it("shows the object display name in the title", () => {
      renderModal()
      expect(screen.getByTitle("report.pdf")).toBeInTheDocument()
    })

    it("shows warning about permanent deletion", () => {
      renderModal()
      expect(screen.getByText(/will be permanently deleted/i)).toBeInTheDocument()
    })

    it("does not show SLO or DLO info notes for regular objects", () => {
      renderModal()
      expect(screen.queryByText(/static large object/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/dynamic large object/i)).not.toBeInTheDocument()
    })

    it("does not show Keep segments checkbox for regular objects", () => {
      renderModal()
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    })

    it("calls mutate without multipartManifest for regular objects", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      const call = mockMutate.mock.calls[0][0]
      expect(call.container).toBe("test-container")
      expect(call.object).toBe("folder/report.pdf")
      expect(call).not.toHaveProperty("multipartManifest")
    })
  })

  // ── SLO (delete variant) ──────────────────────────────────────────────────

  describe("SLO", () => {
    beforeEach(() => {
      mockMetadata = { staticLargeObject: true }
    })

    it("shows SLO info note explaining segments will be deleted by default", () => {
      renderModal()
      expect(screen.getByText(/static large object/i)).toBeInTheDocument()
    })

    it("shows Keep segments checkbox for SLO", () => {
      renderModal()
      expect(screen.getByRole("checkbox")).toBeInTheDocument()
    })

    it("Keep segments checkbox is unchecked by default", () => {
      renderModal()
      expect(screen.getByRole("checkbox")).not.toBeChecked()
    })

    it("calls mutate with multipartManifest='delete' when Keep segments is unchecked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: mockProjectId,
          container: "test-container",
          object: "folder/report.pdf",
          multipartManifest: "delete",
        }),
        expect.anything()
      )
    })

    it("calls mutate without multipartManifest when Keep segments is checked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("checkbox"))
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      const call = mockMutate.mock.calls[0][0]
      expect(call).not.toHaveProperty("multipartManifest")
    })

    it("shows Keep segments checkbox label", () => {
      renderModal()
      expect(screen.getByText(/Keep segments/i)).toBeInTheDocument()
    })
  })

  // ── DLO (delete variant) ──────────────────────────────────────────────────

  describe("DLO", () => {
    beforeEach(() => {
      mockMetadata = { objectManifest: "segments/report-" }
    })

    it("shows DLO info note explaining only manifest is deleted", () => {
      renderModal()
      expect(screen.getByText(/dynamic large object/i)).toBeInTheDocument()
    })

    it("does not show Keep segments checkbox for DLO", () => {
      renderModal()
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    })

    it("calls mutate without multipartManifest for DLO", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      const call = mockMutate.mock.calls[0][0]
      expect(call).not.toHaveProperty("multipartManifest")
    })
  })

  // ── Keep segments checkbox state reset ───────────────────────────────────

  describe("Keep segments state reset", () => {
    it("resets Keep segments checkbox to unchecked when modal reopens", async () => {
      mockMetadata = { staticLargeObject: true }
      const user = userEvent.setup()
      const { rerender } = render(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteObjectModal isOpen={true} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      await user.click(screen.getByRole("checkbox"))
      expect(screen.getByRole("checkbox")).toBeChecked()
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteObjectModal isOpen={false} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <DeleteObjectModal isOpen={true} object={makeObject()} onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.getByRole("checkbox")).not.toBeChecked()
    })
  })

  // ── Callbacks ─────────────────────────────────────────────────────────────

  describe("Callbacks", () => {
    it("calls onSuccess with display name after successful deletion", async () => {
      const onSuccess = vi.fn()
      mockMutate = vi.fn((_input, { onSuccess: cb }) => cb?.())
      const user = userEvent.setup()
      renderModal({ onSuccess })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onSuccess).toHaveBeenCalledWith("report.pdf")
    })

    it("calls onError with display name and message on failure", async () => {
      const onError = vi.fn()
      mockMutate = vi.fn((_input, { onError: cb }) => cb?.({ message: "Forbidden" }))
      const user = userEvent.setup()
      renderModal({ onError })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onError).toHaveBeenCalledWith("report.pdf", "Forbidden")
    })

    it("calls onClose after mutation settles", async () => {
      const onClose = vi.fn()
      mockMutate = vi.fn((_input, { onSettled: cb }) => cb?.())
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onClose).toHaveBeenCalled()
    })

    it("calls onClose when Cancel is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
