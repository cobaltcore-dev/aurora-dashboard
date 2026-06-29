import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider, toast } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import type { ReactNode } from "react"
import { CredentialPrompt } from "./CredentialPrompt"

// ─── Mock the Juno toast API ──────────────────────────────────────────────────
// The component now fires notifications through the NotificationManager (Sonner).
// We assert the component calls the right toast method with the right content;
// rendering/auto-dismiss is the library's responsibility, not this component's.

vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cloudoperators/juno-ui-components")>()
  return {
    ...actual,
    toast: Object.assign(actual.toast, { success: vi.fn(), error: vi.fn() }),
  }
})

// Resolve the toast message argument, which may be a ReactNode or a () => ReactNode.
const resolveNode = (node: ReactNode | (() => ReactNode)): ReactNode => (typeof node === "function" ? node() : node)

const renderToastMessage = (node: ReactNode | (() => ReactNode)) =>
  render(<I18nProvider i18n={i18n}>{resolveNode(node)}</I18nProvider>)

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

type MutationOptions = {
  onSuccess?: () => void
  onError?: (error: { message: string }) => void
}

const { mockInvalidate, mockMutate, mockState } = vi.hoisted(() => {
  const mockState = {
    mutationError: null as string | null,
    isPending: false,
    capturedOptions: {} as MutationOptions,
  }
  const mockMutate = vi.fn().mockImplementation(() => {
    if (mockState.mutationError) {
      mockState.capturedOptions.onError?.({ message: mockState.mutationError })
    } else {
      mockState.capturedOptions.onSuccess?.()
    }
  })
  return { mockInvalidate: vi.fn(), mockMutate, mockState }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          ec2Credentials: { list: { invalidate: mockInvalidate } },
        },
      },
    }),
    storage: {
      ceph: {
        ec2Credentials: {
          create: {
            useMutation: (options: MutationOptions) => {
              mockState.capturedOptions = options ?? {}
              return { mutate: mockMutate, isPending: mockState.isPending }
            },
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderCredentialPrompt = ({ onSuccess = vi.fn() }: { onSuccess?: () => void } = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CredentialPrompt onSuccess={onSuccess} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CredentialPrompt", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.mutationError = null
    mockState.capturedOptions = {}
    mockState.isPending = false
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    test("renders setup prompt with correct title", () => {
      renderCredentialPrompt()
      expect(screen.getByText("S3 Object Storage — Setup Required")).toBeInTheDocument()
    })

    test("renders explanatory text about EC2 credentials", () => {
      renderCredentialPrompt()
      expect(screen.getByText(/To access S3 Object Storage, you need EC2 credentials/)).toBeInTheDocument()
      expect(screen.getByText(/Click the button below to automatically generate credentials/)).toBeInTheDocument()
    })

    test("renders Create Credential button", () => {
      renderCredentialPrompt()
      expect(screen.getByRole("button", { name: "Create S3 Credentials" })).toBeInTheDocument()
    })

    test("button is not disabled by default", () => {
      renderCredentialPrompt()
      expect(screen.getByRole("button", { name: "Create S3 Credentials" })).not.toBeDisabled()
    })
  })

  describe("Button interaction", () => {
    test("calls mutation with project_id when clicked", async () => {
      const user = userEvent.setup()
      renderCredentialPrompt()

      const button = screen.getByRole("button", { name: "Create S3 Credentials" })
      await user.click(button)

      expect(mockMutate).toHaveBeenCalledTimes(1)
      expect(mockMutate).toHaveBeenCalledWith({ project_id: mockProjectId })
    })

    test("shows Creating... text when mutation is pending", () => {
      mockState.isPending = true
      renderCredentialPrompt()

      expect(screen.getByRole("button", { name: "Creating Credentials..." })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Create S3 Credentials" })).not.toBeInTheDocument()
    })

    test("disables button when mutation is pending", () => {
      mockState.isPending = true
      renderCredentialPrompt()

      expect(screen.getByRole("button", { name: "Creating Credentials..." })).toBeDisabled()
    })
  })

  describe("Success handling", () => {
    test("calls onSuccess callback when credential creation succeeds", async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      renderCredentialPrompt({ onSuccess: mockOnSuccess })

      const button = screen.getByRole("button", { name: "Create S3 Credentials" })
      await user.click(button)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })

    test("invalidates ec2Credentials query when creation succeeds", async () => {
      const user = userEvent.setup()
      renderCredentialPrompt()

      const button = screen.getByRole("button", { name: "Create S3 Credentials" })
      await user.click(button)

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1)
      })
    })

    test("does not fire an error notification on success", async () => {
      const user = userEvent.setup()
      renderCredentialPrompt()

      await user.click(screen.getByRole("button", { name: "Create S3 Credentials" }))

      await waitFor(() => expect(mockInvalidate).toHaveBeenCalled())
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe("Error handling", () => {
    test("fires an error notification when credential creation fails", async () => {
      const user = userEvent.setup()
      mockState.mutationError = "Failed to create EC2 credential"
      renderCredentialPrompt()

      await user.click(screen.getByRole("button", { name: "Create S3 Credentials" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))

      renderToastMessage(vi.mocked(toast.error).mock.calls[0][0])
      expect(screen.getByText(/Failed to create credential:/)).toBeInTheDocument()
      expect(screen.getByText(/Failed to create EC2 credential/)).toBeInTheDocument()
    })

    test("uses the error notification, not success", async () => {
      const user = userEvent.setup()
      mockState.mutationError = "Permission denied"
      renderCredentialPrompt()

      await user.click(screen.getByRole("button", { name: "Create S3 Credentials" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalled())
      expect(toast.success).not.toHaveBeenCalled()
    })

    test("does not call onSuccess callback when creation fails", async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      mockState.mutationError = "Creation failed"
      renderCredentialPrompt({ onSuccess: mockOnSuccess })

      await user.click(screen.getByRole("button", { name: "Create S3 Credentials" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalled())
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    test("includes the specific error message in the notification", async () => {
      const user = userEvent.setup()
      mockState.mutationError = "Quota exceeded"
      renderCredentialPrompt()

      await user.click(screen.getByRole("button", { name: "Create S3 Credentials" }))

      await waitFor(() => expect(toast.error).toHaveBeenCalled())

      renderToastMessage(vi.mocked(toast.error).mock.calls[0][0])
      expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument()
    })
  })

  describe("Layout and styling", () => {
    test("renders content in a centered vertical stack", () => {
      const { container } = renderCredentialPrompt()
      const stack = container.querySelector(".juno-stack")
      expect(stack).toBeInTheDocument()
      expect(stack).toHaveClass("jn:flex", "jn:flex-col")
    })

    test("title uses heading style", () => {
      renderCredentialPrompt()
      const title = screen.getByText("S3 Object Storage — Setup Required")
      expect(title.tagName).toBe("H2")
    })
  })
})
