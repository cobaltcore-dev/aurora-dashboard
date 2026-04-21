import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { UploadObjectModal } from "./UploadObjectModal"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockInvalidate = vi.fn()

// Controls uploadObject.mutate: null = success, string = error message
let mutationError: string | null = null
// Controls watchUploadProgress subscription data
let mockUploadProgress: { percent: number; uploaded: number; total: number } | undefined = undefined

const mockMutate = vi.fn().mockImplementation(async () => {
  if (mutationError) throw new Error(mutationError)
})

vi.mock("@/client/trpcClient", () => ({
  trpcClient: {
    storage: {
      swift: {
        uploadObject: {
          mutate: (...args: unknown[]) => mockMutate(...args),
        },
      },
    },
  },
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listObjects: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
    storage: {
      swift: {
        watchUploadProgress: {
          useSubscription: vi.fn(() => ({ data: mockUploadProgress })),
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  currentPrefix = "",
  container = "test-container",
  account = undefined as string | undefined,
  onClose = vi.fn(),
  onSuccess = vi.fn(),
  onError = vi.fn(),
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <UploadObjectModal
          isOpen={isOpen}
          currentPrefix={currentPrefix}
          container={container}
          account={account}
          onClose={onClose}
          onSuccess={onSuccess}
          onError={onError}
        />
      </PortalProvider>
    </I18nProvider>
  )

const makeFile = (name = "report.pdf", size = 1024, type = "application/pdf") =>
  new File(["x".repeat(size)], name, { type })

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UploadObjectModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    mockUploadProgress = undefined
    mockMutate.mockImplementation(async () => {
      if (mutationError) throw new Error(mutationError)
    })
    await act(async () => {
      i18n.activate("en")
    })
  })

  // ── Visibility ────────────────────────────────────────────────────────────

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Upload object to:/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true", () => {
      renderModal()
      expect(screen.getByText(/Upload object to:/i)).toBeInTheDocument()
    })

    test("shows root prefix '/' in title when currentPrefix is empty", () => {
      renderModal({ currentPrefix: "" })
      expect(screen.getByText("/")).toBeInTheDocument()
    })

    test("shows current prefix in title when inside a subfolder", () => {
      renderModal({ currentPrefix: "documents/" })
      expect(screen.getByText("documents/")).toBeInTheDocument()
    })
  })

  // ── Form rendering ────────────────────────────────────────────────────────

  describe("Form rendering", () => {
    test("renders file drop zone", () => {
      renderModal()
      expect(screen.getByText(/Click to upload/i)).toBeInTheDocument()
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument()
    })

    test("renders Upload and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Upload$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("Upload button is disabled when no file selected", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Upload$/i })).toBeDisabled()
    })

    test("Upload button is enabled after file is selected", async () => {
      const user = userEvent.setup()
      renderModal()

      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      expect(screen.getByRole("button", { name: /^Upload$/i })).not.toBeDisabled()
    })
  })

  // ── File selection ────────────────────────────────────────────────────────

  describe("File selection", () => {
    test("shows selected file name and size after selection", async () => {
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("photo.png", 2048, "image/png"))
      expect(screen.getAllByText(/photo\.png/).length).toBeGreaterThan(0)
    })

    test("shows object path preview after file is selected", async () => {
      const user = userEvent.setup()
      renderModal({ currentPrefix: "docs/" })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      expect(screen.getByText(/docs\/report\.pdf/)).toBeInTheDocument()
    })

    test("shows Remove button after file is selected", async () => {
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      expect(screen.getByRole("button", { name: /Remove/i })).toBeInTheDocument()
    })

    test("clears selected file when Remove is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      await user.click(screen.getByRole("button", { name: /Remove/i }))
      expect(screen.queryByText(/report\.pdf/)).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /^Upload$/i })).toBeDisabled()
    })
  })

  // ── Submission ────────────────────────────────────────────────────────────

  describe("Submission", () => {
    test("calls trpcClient.uploadObject.mutate with correct file", async () => {
      const user = userEvent.setup()
      renderModal({ container: "my-bucket", currentPrefix: "docs/" })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            context: expect.objectContaining({
              headers: expect.objectContaining({
                "x-upload-container": "my-bucket",
                "x-upload-object": "docs/report.pdf",
                "x-upload-id": "my-bucket:docs/report.pdf",
              }),
            }),
          })
        )
      })
    })

    test("sends correct content-type header", async () => {
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("photo.png", 512, "image/png"))
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            context: expect.objectContaining({
              headers: expect.objectContaining({ "x-upload-type": "image/png" }),
            }),
          })
        )
      })
    })

    test("sends account header when account is provided", async () => {
      const user = userEvent.setup()
      renderModal({ account: "AUTH_abc123" })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.any(File),
          expect.objectContaining({
            context: expect.objectContaining({
              headers: expect.objectContaining({ "x-upload-account": "AUTH_abc123" }),
            }),
          })
        )
      })
    })

    test("does not send account header when account is not provided", async () => {
      const user = userEvent.setup()
      renderModal({ account: undefined })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        const headers = mockMutate.mock.calls[0][1].context.headers
        expect(headers).not.toHaveProperty("x-upload-account")
      })
    })

    test("calls listObjects.invalidate after successful upload", async () => {
      const user = userEvent.setup()
      renderModal({ container: "test-container" })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledWith({ container: "test-container" })
      })
    })

    test("calls onSuccess with file name after successful upload", async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith("report.pdf")
      })
    })

    test("shows Uploading... label while upload is in progress", async () => {
      let resolveUpload!: () => void
      mockMutate.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpload = resolve
          })
      )
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Uploading\.\.\./i })).toBeInTheDocument()
      })
      resolveUpload()
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────

  describe("Error handling", () => {
    test("shows error message when upload fails", async () => {
      mutationError = "Quota exceeded"
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(screen.getByText(/Quota exceeded/i)).toBeInTheDocument()
      })
    })

    test("calls onError with file name and error message on failure", async () => {
      mutationError = "Internal Server Error"
      const onError = vi.fn()
      const user = userEvent.setup()
      renderModal({ onError })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("report.pdf", "Internal Server Error")
      })
    })

    test("does not call onSuccess when upload fails", async () => {
      mutationError = "Network error"
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      renderModal({ onSuccess })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled()
      })
    })
  })

  // ── Progress tracking ─────────────────────────────────────────────────────

  describe("Progress tracking", () => {
    test("shows upload progress bar when percent is available", async () => {
      let resolveUpload!: () => void
      mockMutate.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpload = resolve
          })
      )
      mockUploadProgress = { percent: 60, uploaded: 600, total: 1000 }
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(screen.getByText(/60%/)).toBeInTheDocument()
      })
      resolveUpload()
    })

    test("shows plain Uploading... when no progress data yet", async () => {
      let resolveUpload!: () => void
      mockMutate.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpload = resolve
          })
      )
      mockUploadProgress = undefined
      const user = userEvent.setup()
      renderModal()
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        // The progress section shows "Uploading..." as a span (not the button)
        const spinner = document.querySelector("[role=progressbar]")
        expect(spinner).toBeInTheDocument()
        expect(spinner?.parentElement?.textContent).toMatch(/Uploading\.\.\./)
      })
      resolveUpload()
    })
  })

  // ── Cancel / close ────────────────────────────────────────────────────────

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("does not call onClose while upload is in progress", async () => {
      let resolveUpload!: () => void
      mockMutate.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveUpload = resolve
          })
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile())
      await user.click(screen.getByRole("button", { name: /^Upload$/i }))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Uploading\.\.\./i })).toBeInTheDocument()
      })
      // Cancel click should be ignored while pending
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).not.toHaveBeenCalled()
      resolveUpload()
    })

    test("resets state after close", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      const { rerender } = renderModal({ onClose, isOpen: true })
      const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
      await user.upload(fileInput, makeFile("report.pdf"))
      expect(screen.getAllByText(/report\.pdf/).length).toBeGreaterThan(0)
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <UploadObjectModal isOpen={true} currentPrefix="" container="test-container" onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )
      expect(screen.queryByText(/report\.pdf/)).not.toBeInTheDocument()
    })
  })
})
