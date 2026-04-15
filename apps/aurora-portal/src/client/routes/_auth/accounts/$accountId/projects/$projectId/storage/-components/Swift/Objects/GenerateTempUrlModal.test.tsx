import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { GenerateTempUrlModal } from "./GenerateTempUrlModal"
import type { ObjectRow } from "./"

// ─── Mock TanStack Router ─────────────────────────────────────────────────────

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    useParams: vi.fn(() => ({ containerName: "test-container" })),
  }
})

// ─── Mock tRPC ────────────────────────────────────────────────────────────────
// Plain factory (not vi.fn wrapping) so vi.clearAllMocks() doesn't wipe the implementation.

let capturedMutateOpts: {
  onSuccess?: (data: { url: string; expiresAt: number }) => void
  onError?: (error: { message: string }) => void
} = {}

let trpcState = {
  mutate: vi.fn(),
  isPending: false,
  reset: vi.fn(),
}

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      swift: {
        generateTempUrl: {
          useMutation: (opts: {
            onSuccess?: (data: { url: string; expiresAt: number }) => void
            onError?: (error: { message: string }) => void
          }) => {
            capturedMutateOpts = opts
            return {
              mutate: (input: unknown) => trpcState.mutate(input),
              isPending: trpcState.isPending,
              reset: trpcState.reset,
            }
          },
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockObject: ObjectRow = {
  kind: "object",
  name: "path/to/report.pdf",
  displayName: "report.pdf",
  bytes: 1024,
  last_modified: "2024-03-01T08:00:00.000000",
  content_type: "application/pdf",
}

const MOCK_URL = "https://swift.example.com/v1/AUTH_x/container/report.pdf?temp_url_sig=abc&temp_url_expires=9999"

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  object = mockObject as ObjectRow | null,
  onClose = vi.fn(),
  onCopySuccess = vi.fn(),
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <GenerateTempUrlModal isOpen={isOpen} object={object} onClose={onClose} onCopySuccess={onCopySuccess} />
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

describe("GenerateTempUrlModal", () => {
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

    test("renders nothing when object is null", () => {
      renderModal({ object: null })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    test("renders modal when isOpen is true and object is set", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    test("shows object displayName in modal title", () => {
      renderModal()
      expect(screen.getByTitle("report.pdf")).toBeInTheDocument()
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
      expect(screen.queryByLabelText(/Temporary URL/i)).not.toBeInTheDocument()
    })

    test("shows info message about temporary URLs", () => {
      renderModal()
      expect(screen.getByText(/time-limited read access/i)).toBeInTheDocument()
    })
  })

  // ── URL generation ──────────────────────────────────────────────────────────

  describe("URL generation", () => {
    test("calls generateTempUrl mutation with correct params (default 24h preset)", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith({
        container: "test-container",
        object: "path/to/report.pdf",
        method: "GET",
        expiresIn: 86400,
      })
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
      expect(trpcState.mutate).toHaveBeenCalledWith(expect.objectContaining({ expiresIn: 3600 }))
    })

    test("calls mutation with expiresIn 604800 when 7 days preset is selected", async () => {
      const user = userEvent.setup()
      renderModal()
      await selectPreset(user, "7 days")
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      expect(trpcState.mutate).toHaveBeenCalledWith(expect.objectContaining({ expiresIn: 604800 }))
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
      expect(trpcState.mutate).toHaveBeenCalledWith(expect.objectContaining({ expiresIn: 1800 }))
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
  })

  // ── Error states ────────────────────────────────────────────────────────────

  describe("Error states", () => {
    test("shows no-key warning when error message contains 'Temp URL key not configured'", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "Temp URL key not configured for this account or container" })
      })
      expect(screen.getByText(/No Temp URL key configured/i)).toBeInTheDocument()
    })

    test("no-key warning references both meta header names", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "Temp URL key not configured for this account or container" })
      })
      expect(screen.getByText(/X-Account-Meta-Temp-URL-Key/)).toBeInTheDocument()
      expect(screen.getByText(/X-Container-Meta-Temp-URL-Key/)).toBeInTheDocument()
    })

    test("shows generic danger message for non-key errors", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(screen.getByText(/Failed to generate temporary URL/i)).toBeInTheDocument()
      expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
    })

    test("does not show no-key warning for generic errors", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(screen.queryByText(/No Temp URL key configured/i)).not.toBeInTheDocument()
    })

    test("clears generic error when preset changes after an error", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Generate URL/i }))
      await act(async () => {
        capturedMutateOpts.onError?.({ message: "500 Internal Server Error" })
      })
      expect(screen.getByText(/Failed to generate temporary URL/i)).toBeInTheDocument()
      await selectPreset(user, "1 hour")
      expect(screen.queryByText(/Failed to generate temporary URL/i)).not.toBeInTheDocument()
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

    test("calls onCopySuccess with object displayName after successful copy", async () => {
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
        expect(onCopySuccess).toHaveBeenCalledWith("report.pdf")
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
  })

  // ── Close / reset ───────────────────────────────────────────────────────────

  describe("Close and reset", () => {
    test("calls onClose when the footer Close button is clicked", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })
      // The modal footer button has text "Close"; the header icon button has aria-label="close".
      // Exact case match on "Close" targets only the footer button.
      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(onClose).toHaveBeenCalled()
    })

    test("does not call mutate when Close is clicked without generating", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(trpcState.mutate).not.toHaveBeenCalled()
    })
  })
})
