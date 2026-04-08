import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { DeleteObjectModal, DeleteObjectVariant } from "./DeleteObjectModal"
import type { ObjectRow } from "./"

// ─── Mock tRPC ────────────────────────────────────────────────────────────────

let mockMutate = vi.fn()
let mockIsPending = false

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
  variant = "delete" as DeleteObjectVariant,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <DeleteObjectModal
          isOpen={isOpen}
          object={object}
          variant={variant}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteObjectModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockMutate = vi.fn()
    mockIsPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

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

  describe("variant: delete", () => {
    it("shows Delete object title", () => {
      renderModal({ variant: "delete" })
      expect(screen.getByText(/Delete object:/i)).toBeInTheDocument()
    })

    it("shows the object display name in the title", () => {
      renderModal({ variant: "delete" })
      expect(screen.getByTitle("report.pdf")).toBeInTheDocument()
    })

    it("shows warning about permanent deletion", () => {
      renderModal({ variant: "delete" })
      expect(screen.getByText(/will be permanently deleted/i)).toBeInTheDocument()
    })

    it("shows info note about large object segments", () => {
      renderModal({ variant: "delete" })
      expect(screen.getByText(/static and dynamic large objects/i)).toBeInTheDocument()
    })

    it("shows Delete confirm button", () => {
      renderModal({ variant: "delete" })
      expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument()
    })
  })

  describe("variant: keep-segments", () => {
    it("shows Delete manifest title", () => {
      renderModal({ variant: "keep-segments" })
      expect(screen.getByText(/Delete manifest:/i)).toBeInTheDocument()
    })

    it("shows info note that segments will be retained", () => {
      renderModal({ variant: "keep-segments" })
      expect(screen.getByText(/retained/i)).toBeInTheDocument()
    })

    it("explains when to use keep-segments vs delete", () => {
      renderModal({ variant: "keep-segments" })
      expect(screen.getByText(/shared across multiple manifests/i)).toBeInTheDocument()
    })
  })

  describe("Confirmation", () => {
    it("calls mutate with correct input on confirm (delete variant)", async () => {
      const user = userEvent.setup()
      renderModal({ variant: "delete" })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          container: "test-container",
          object: "folder/report.pdf",
          multipartManifest: "delete",
        }),
        expect.anything()
      )
    })

    it("calls mutate without multipartManifest on confirm (keep-segments variant)", async () => {
      const user = userEvent.setup()
      renderModal({ variant: "keep-segments" })
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      const call = mockMutate.mock.calls[0][0]
      expect(call.container).toBe("test-container")
      expect(call.object).toBe("folder/report.pdf")
      expect(call).not.toHaveProperty("multipartManifest")
    })

    it("calls onSuccess with display name after successful deletion", async () => {
      const onSuccess = vi.fn()
      mockMutate = vi.fn((_input, { onSuccess: cb }) => cb?.())
      renderModal({ onSuccess })
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onSuccess).toHaveBeenCalledWith("report.pdf")
    })

    it("calls onError with display name and message on failure", async () => {
      const onError = vi.fn()
      mockMutate = vi.fn((_input, { onError: cb }) => cb?.({ message: "Forbidden" }))
      renderModal({ onError })
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onError).toHaveBeenCalledWith("report.pdf", "Forbidden")
    })

    it("calls onClose after mutation settles", async () => {
      const onClose = vi.fn()
      mockMutate = vi.fn((_input, { onSettled: cb }) => cb?.())
      renderModal({ onClose })
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: /^Delete$/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("Cancel", () => {
    it("calls onClose when Cancel is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
