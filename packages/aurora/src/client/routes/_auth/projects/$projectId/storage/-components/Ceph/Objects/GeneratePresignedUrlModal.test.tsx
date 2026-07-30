import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { GeneratePresignedUrlModal } from "./GeneratePresignedUrlModal"

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── Mock tRPC ────────────────────────────────────────────────────────────────
// Plain factory (not vi.fn wrapping) so vi.clearAllMocks() doesn't wipe the implementation.

let capturedMutateOpts: {
  onSuccess?: (data: { url: string; expiresAt: number }) => void
  onError?: (error: { message: string; data?: { code?: string } | null }) => void
} = {}

let trpcState = {
  mutate: vi.fn(),
  isPending: false,
  reset: vi.fn(),
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          generatePresignedUrl: {
            useMutation: () => ({
              mutate: (
                input: unknown,
                opts?: {
                  onSuccess?: (data: { url: string; expiresAt: number }) => void
                  onError?: (error: { message: string; data?: { code?: string } | null }) => void
                }
              ) => {
                // Capture per-call callbacks so tests can fire them manually
                capturedMutateOpts = opts ?? {}
                trpcState.mutate(input)
              },
              isPending: trpcState.isPending,
              reset: trpcState.reset,
            }),
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBucketName = "test-bucket"
const mockObjectKey = "path/to/report.pdf"

const MOCK_URL =
  "https://ceph.example.com/test-bucket/path/to/report.pdf?X-Amz-Signature=abc&X-Amz-Expires=86400&X-Amz-Algorithm=AWS4-HMAC-SHA256"

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  bucketName = mockBucketName,
  objectKey = mockObjectKey as string | null,
  onClose = vi.fn(),
  onCopySuccess = vi.fn(),
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <GeneratePresignedUrlModal
          isOpen={isOpen}
          bucketName={bucketName}
          objectKey={objectKey}
          onClose={onClose}
          onCopySuccess={onCopySuccess}
        />
      </PortalProvider>
    </I18nProvider>
  )

// Helper: click Generate URL and simulate a successful BFF response
const generateUrl = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{ url: string; expiresAt: number }> = {}
) => {
  await user.click(screen.getByRole("button", { name: /Generate URL/i }))
  await act(async () => {
    capturedMutateOpts.onSuccess?.({
      url: MOCK_URL,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      ...overrides,
    })
  })
}

// Helper: open the Juno Select dropdown and pick an option by its label text.
// Juno Select (Headless UI Listbox) renders a button associated with the "Expires in"
// label via htmlFor — clicking it opens a listbox, then we click the option by text.
const selectPreset = async (user: ReturnType<typeof userEvent.setup>, optionLabel: string) => {
  const trigger = screen.getByLabelText(/Expires in/i)
  await user.click(trigger)
  await user.click(screen.getByRole("option", { name: optionLabel }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GeneratePresignedUrlModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    trpcState = { mutate: vi.fn(), isPending: false, reset: vi.fn() }
    capturedMutateOpts = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ──────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    test("renders nothing when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    test("renders nothing when objectKey is null", () => {
      renderModal({ objectKey: null })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    test("renders modal when isOpen is true and objectKey is set", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    test("shows the object basename in the modal title", () => {
      renderModal()
      // displayName is derived from the key basename (report.pdf), not the full key
      expect(screen.getByTitle("report.pdf")).toBeInTheDocument()
      expect(screen.getByText(/Share URL:/i)).toBeInTheDocument()
    })
  })

  // ── Initial state ───────────────────────────────────────────────────────────

  describe("Initial state", () => {
    test("shows Generate URL confirm button", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /Generate URL/i })).toBeInTheDocument()
    })

    test("shows Expires in label", () => {
      renderModal()
      expect(screen.getByText(/Expires in/i)).toBeInTheDocument()
    })

    test("does not show custom minutes input by default", () => {
      renderModal()
      expect(screen.queryByLabelText(/Custom duration/i)).not.toBeInTheDocument()
    })

    test("does not show generated URL field before generation", () => {
      renderModal()
      expect(screen.queryByLabelText(/Pre-signed URL/i)).not.toBeInTheDocument()
    })

    test("shows info message about pre-signed URLs", () => {
      renderModal()
      expect(screen.getByText(/time-limited read access/i)).toBeInTheDocument()
    })
  })

  // ── URL generation ──────────────────────────────────────────────────────────

  describe("URL generation", () => {
    test("calls generatePresignedUrl mutation with correct params (default 24h preset)", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        containerName: mockBucketName,
        objectKey: mockObjectKey,
        expiresIn: 86400,
      })
    })

    test("does not send a Swift-style account or method field", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      const input = trpcState.mutate.mock.calls[0][0] as Record<string, unknown>
      expect(input).not.toHaveProperty("account")
      expect(input).not.toHaveProperty("method")
    })

    test("shows generated URL in a read-only text field after success", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByDisplayValue(MOCK_URL)).toBeInTheDocument()
    })

    test("shows absolute expiry timestamp alongside the URL", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByText(/Expires in.*—.*at/i)).toBeInTheDocument()
    })

    test("shows expiry label with preset name after generation", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByText(/Expires in 24 hours/i)).toBeInTheDocument()
    })

    test("hides generated URL when Generate URL is clicked a second time", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByDisplayValue(MOCK_URL)).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(screen.queryByDisplayValue(MOCK_URL)).not.toBeInTheDocument()
    })

    test("calls mutation with expiresIn 3600 when 1 hour preset is selected", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "1 hour")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: mockProjectId, expiresIn: 3600 })
      )
    })

    test("calls mutation with expiresIn 604800 when 7 days preset is selected", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "7 days")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: mockProjectId, expiresIn: 604800 })
      )
    })

    test("resets generated URL when preset is changed after generation", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByDisplayValue(MOCK_URL)).toBeInTheDocument()
      await selectPreset(user, "1 hour")
      expect(screen.queryByDisplayValue(MOCK_URL)).not.toBeInTheDocument()
    })
  })

  // ── Custom duration ─────────────────────────────────────────────────────────

  describe("Custom duration", () => {
    test("shows custom minutes input when Custom preset is selected", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      expect(screen.getByLabelText(/Custom duration/i)).toBeInTheDocument()
    })

    test("Generate URL button is disabled when custom is selected but input is empty", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      expect(screen.getByRole("button", { name: /Generate URL/i })).toBeDisabled()
    })

    test("shows validation error and does not mutate when custom minutes is 0", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "0")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(screen.getByText(/valid number of minutes/i)).toBeInTheDocument()
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })

    test("calls mutation with correct expiresIn for 30 custom minutes", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "30")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: mockProjectId, expiresIn: 1800 })
      )
    })

    test("resets generated URL when custom minutes value changes after generation", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "60")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onSuccess?.({ url: MOCK_URL, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
      })
      expect(screen.getByDisplayValue(MOCK_URL)).toBeInTheDocument()
      await user.clear(screen.getByLabelText(/Custom duration/i))
      await user.type(screen.getByLabelText(/Custom duration/i), "90")
      expect(screen.queryByDisplayValue(MOCK_URL)).not.toBeInTheDocument()
    })

    test("rejects decimal input like '1.5' and shows validation error", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "1.5")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(screen.getByText(/valid number of minutes/i)).toBeInTheDocument()
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })

    test("rejects negative custom minutes and shows validation error", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "-1")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(screen.getByText(/valid number of minutes/i)).toBeInTheDocument()
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })

    // Ceph-specific: S3 SigV4 caps pre-signed URLs at 7 days (10080 minutes).
    // The modal rejects anything larger before hitting the BFF.
    test("rejects custom minutes over the 7-day maximum and does not mutate", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "20000")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(screen.getByText(/at most 7 days/i)).toBeInTheDocument()
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })

    test("accepts exactly 10080 custom minutes (7 days) and mutates with 604800s", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "Custom")
      await user.type(screen.getByLabelText(/Custom duration/i), "10080")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: mockProjectId, expiresIn: 604800 })
      )
    })
  })

  // ── Error states ────────────────────────────────────────────────────────────

  describe("Error states", () => {
    test("shows a generic error message when generation fails", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(screen.getByText(/Failed to generate pre-signed URL/i)).toBeInTheDocument()
      expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
    })

    test("clears the error when the preset changes after an error", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(screen.getByText(/Failed to generate pre-signed URL/i)).toBeInTheDocument()
      await selectPreset(user, "1 hour")
      expect(screen.queryByText(/Failed to generate pre-signed URL/i)).not.toBeInTheDocument()
    })

    // There is no "no key" path for S3 pre-signing — the signature is derived from
    // the request's EC2 credentials, so unlike Swift there is nothing to configure.
    test("does not render a Juno warning Message on error (no no-key path)", async () => {
      const user = userEvent.setup()
      const { container } = renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(container.querySelector(".juno-message-warning")).not.toBeInTheDocument()
    })
  })

  // ── Clipboard copy ──────────────────────────────────────────────────────────

  describe("Clipboard copy", () => {
    test("copy button appears after URL is generated", async () => {
      const user = userEvent.setup()
      renderModal()
      await generateUrl(user)
      expect(screen.getByTitle(/Copy URL/i)).toBeInTheDocument()
    })

    test("copy button is absent before URL is generated", () => {
      renderModal()
      expect(screen.queryByTitle(/Copy URL/i)).not.toBeInTheDocument()
    })

    test("clicking copy button writes the URL to clipboard", async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      })
      renderModal()
      await generateUrl(user)
      await user.click(screen.getByTitle(/Copy URL/i))
      expect(writeText).toHaveBeenCalledWith(MOCK_URL)
    })

    test("calls onCopySuccess with the full object key after successful copy", async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      })
      const onCopySuccess = vi.fn()
      renderModal({ onCopySuccess })
      await generateUrl(user)
      await user.click(screen.getByTitle(/Copy URL/i))
      await waitFor(() => {
        // The Ceph toast derives its own basename, so the modal passes the full key
        expect(onCopySuccess).toHaveBeenCalledWith(mockObjectKey)
      })
    })

    test("copy button title changes to Copied! after click", async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      })
      renderModal()
      await generateUrl(user)
      await user.click(screen.getByTitle(/Copy URL/i))
      await waitFor(() => {
        expect(screen.getByTitle(/Copied!/i)).toBeInTheDocument()
      })
    })

    test("shows a copy error when the clipboard write rejects", async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockRejectedValue(new Error("denied"))
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      })
      renderModal()
      await generateUrl(user)
      await user.click(screen.getByTitle(/Copy URL/i))
      await waitFor(() => {
        expect(screen.getByText(/Failed to copy the pre-signed URL/i)).toBeInTheDocument()
      })
    })
  })

  // ── Close / reset ───────────────────────────────────────────────────────────

  describe("Close and reset", () => {
    test("calls onClose when the footer Cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      // The modal footer button has text "Cancel"; the header icon button has aria-label="close".
      // Exact case match on "Cancel" targets only the footer button.
      await user.click(screen.getByRole("button", { name: "Cancel" }))
      expect(onClose).toHaveBeenCalled()
    })

    test("does not call mutate when Cancel is clicked without generating", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: "Cancel" }))
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })
  })
})
