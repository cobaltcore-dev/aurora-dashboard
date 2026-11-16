import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CliSetupModal } from "./CliSetupModal"

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({ onTrackEvent: mockOnTrackEvent }),
}))

type StatusData = { hasCredentials: boolean; endpoint: string; region: string }
type StatusError = { message: string; data?: { code: string } }

const { mockState, mockUseQuery, mockRefetch, mockCancelStatus, mockTerminate } = vi.hoisted(() => {
  const mockState = {
    data: undefined as StatusData | undefined,
    error: null as StatusError | null,
    isRefetching: false,
  }
  const mockRefetch = vi.fn()
  const mockCancelStatus = vi.fn().mockResolvedValue(undefined)
  const mockTerminate = vi.fn()
  const mockUseQuery = vi.fn(() => ({
    data: mockState.data,
    error: mockState.error,
    isRefetching: mockState.isRefetching,
    refetch: mockRefetch,
  }))
  return { mockState, mockUseQuery, mockRefetch, mockCancelStatus, mockTerminate }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({ storage: { ceph: { containers: { status: { cancel: mockCancelStatus } } } } }),
    storage: { ceph: { containers: { status: { useQuery: mockUseQuery } } } },
  },
  trpcClient: { auth: { terminateUserSession: { mutate: mockTerminate } } },
}))

const STATUS: StatusData = { hasCredentials: true, endpoint: "https://rgw.example.com", region: "eu-de-2" }
const SERVER_ERROR: StatusError = { message: "Ceph region not configured", data: { code: "INTERNAL_SERVER_ERROR" } }

type Props = { isOpen?: boolean; onClose?: () => void; onOpenCredentials?: () => void; bucketName?: string }

const ui = ({ isOpen = true, onClose = vi.fn(), onOpenCredentials = vi.fn(), bucketName }: Props = {}) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>
      <CliSetupModal isOpen={isOpen} onClose={onClose} onOpenCredentials={onOpenCredentials} bucketName={bucketName} />
    </PortalProvider>
  </I18nProvider>
)

const renderModal = (props: Props = {}) => render(ui(props))

describe("CliSetupModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.data = STATUS
    mockState.error = null
    mockState.isRefetching = false
    mockCancelStatus.mockResolvedValue(undefined)
    mockTerminate.mockResolvedValue(undefined)
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("shows AWS CLI instructions by default", () => {
    renderModal()
    expect(screen.getByTestId("cli-step-createProfile")).toBeInTheDocument()
    expect(screen.getByTestId("cli-step-listBuckets")).toHaveTextContent("--endpoint-url https://rgw.example.com")
    expect(screen.getByText("Install AWS CLI v2")).toBeInTheDocument()
  })

  test("queries status with the same input and options as ManageCredentialsModal", () => {
    renderModal()
    expect(mockUseQuery).toHaveBeenCalledWith(
      { project_id: "test-project-123" },
      { enabled: true, retry: false, staleTime: Infinity }
    )
  })

  test("does not query status while closed", () => {
    renderModal({ isOpen: false })
    expect(mockUseQuery).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("CLI Tool")).not.toBeInTheDocument()
  })

  test("switching tool shows its steps and emits selectTool once", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByLabelText("CLI Tool"))
    await user.click(screen.getByRole("option", { name: "rclone" }))

    expect(screen.getByTestId("cli-step-writeConfig")).toHaveTextContent("provider = Ceph")
    expect(screen.queryByText(/aws configure/)).not.toBeInTheDocument()
    expect(mockOnTrackEvent).toHaveBeenCalledWith({
      source: "dropdown",
      action: "cliSetup.selectTool",
      metadata: { tool: "rclone" },
    })

    mockOnTrackEvent.mockClear()
    await user.click(screen.getByLabelText("CLI Tool"))
    // The selected option's accessible name carries a check icon label as well.
    await user.click(screen.getByRole("option", { name: /rclone/ }))
    expect(mockOnTrackEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: "cliSetup.selectTool" }))
  })

  test("pre-fills the bucket name", () => {
    renderModal({ bucketName: "my-bucket" })
    expect(screen.getByTestId("cli-step-listObjects")).toHaveTextContent("s3://my-bucket/")
  })

  test("loading shows a progress status with the selector and Manage Credentials", () => {
    mockState.data = undefined
    renderModal()
    expect(screen.getByText("Loading Connection Details…")).toBeInTheDocument()
    expect(screen.getByText("CLI Tool")).toBeInTheDocument()
    expect(screen.getByTestId("cli-setup-manage-credentials")).toBeInTheDocument()
  })

  test("the timeout error is cleared after close and reopen", async () => {
    vi.useFakeTimers()
    mockState.data = undefined
    const view = renderModal()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(screen.getByText("Connection Details Unavailable")).toBeInTheDocument()

    view.rerender(ui({ isOpen: false }))
    view.rerender(ui({ isOpen: true }))

    expect(screen.getByText("Loading Connection Details…")).toBeInTheDocument()
    expect(screen.queryByText("Connection Details Unavailable")).not.toBeInTheDocument()
    view.unmount()
  })

  describe("timeout", () => {
    test("shows the network error with Retry, and Retry cancels before refetching", async () => {
      vi.useFakeTimers()
      mockState.data = undefined
      const view = renderModal()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })

      expect(screen.getByText("Connection Details Unavailable")).toBeInTheDocument()
      expect(screen.getByText(/Check the network connection/)).toBeInTheDocument()

      const callOrder: string[] = []
      mockCancelStatus.mockImplementation(async () => {
        callOrder.push("cancel")
      })
      mockRefetch.mockImplementation(() => {
        callOrder.push("refetch")
      })

      await act(async () => {
        screen.getByRole("button", { name: "Retry" }).click()
      })

      expect(mockCancelStatus).toHaveBeenCalledWith({ project_id: "test-project-123" })
      expect(callOrder).toEqual(["cancel", "refetch"])
      expect(screen.getByText("Loading Connection Details…")).toBeInTheDocument()
      view.unmount()
    })

    test("a server error arriving after the timeout shows its message without Retry", async () => {
      vi.useFakeTimers()
      mockState.data = undefined
      const view = renderModal()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })

      mockState.error = SERVER_ERROR
      view.rerender(ui())

      expect(screen.getByText(/Ceph region not configured/)).toBeInTheDocument()
      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
      expect(screen.queryByText(/Check the network connection/)).not.toBeInTheDocument()
    })
  })

  test("network error shows an assertive alert with Retry and no steps", () => {
    mockState.data = undefined
    mockState.error = { message: "fetch failed", data: undefined }
    renderModal()

    const alert = screen.getByRole("alert")
    expect(alert).toHaveAttribute("aria-live", "assertive")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(screen.queryByTestId(/^cli-step-/)).not.toBeInTheDocument()
  })

  test.each(["INTERNAL_SERVER_ERROR", "NOT_FOUND"])("server error %s shows the message without Retry", (code) => {
    mockState.data = undefined
    mockState.error = { message: "Ceph region not configured", data: { code } }
    renderModal()

    expect(screen.getByText(/Ceph region not configured/)).toBeInTheDocument()
    expect(screen.getByText(/Contact your administrator if the problem persists/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  test("UNAUTHORIZED renders nothing, terminates the session and redirects", async () => {
    const replace = vi.fn()
    const original = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/projects/p1/storage", search: "?a=1", hash: "#h", replace },
    })
    try {
      mockState.data = undefined
      mockState.error = { message: "Unauthorized", data: { code: "UNAUTHORIZED" } }
      // Render closed first, then open (as the app does). Juno Modal's portal target switches from
      // document.body to its own .juno-portal div after the first render, which remounts the body
      // when the modal is rendered open on its very first render.
      const view = renderModal({ isOpen: false })
      view.rerender(ui({ isOpen: true }))

      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.queryByText("Loading Connection Details…")).not.toBeInTheDocument()
      expect(screen.queryByTestId(/^cli-step-/)).not.toBeInTheDocument()
      expect(mockTerminate).toHaveBeenCalledTimes(1)
      await vi.waitFor(() =>
        expect(replace).toHaveBeenCalledWith(`/?redirect=${encodeURIComponent("/projects/p1/storage?a=1#h")}`)
      )
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original })
    }
  })

  describe("analytics", () => {
    test("emits cliSetup.open when opened", () => {
      renderModal()
      expect(mockOnTrackEvent).toHaveBeenCalledWith({ source: "modal", action: "cliSetup.open" })
    })

    test("Close emits cliSetup.close and calls onClose", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      renderModal({ onClose })

      await user.click(screen.getByRole("button", { name: "Close" }))

      expect(mockOnTrackEvent).toHaveBeenCalledWith({ source: "modal", action: "cliSetup.close" })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    test("Manage Credentials emits cliSetup.close and calls onOpenCredentials, not onClose", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onOpenCredentials = vi.fn()
      renderModal({ onClose, onOpenCredentials })

      await user.click(screen.getByTestId("cli-setup-manage-credentials"))

      expect(mockOnTrackEvent).toHaveBeenCalledWith({ source: "modal", action: "cliSetup.close" })
      expect(onOpenCredentials).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  test("a backdrop click closes the modal, a click inside does not", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByText("Prerequisites"))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(document.querySelector(".juno-modal-container") as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("tool resets to AWS CLI after close and reopen", async () => {
    const user = userEvent.setup()
    const view = renderModal()

    await user.click(screen.getByLabelText("CLI Tool"))
    await user.click(screen.getByRole("option", { name: "s3cmd" }))
    expect(screen.getByText("Install s3cmd")).toBeInTheDocument()

    view.rerender(ui({ isOpen: false }))
    view.rerender(ui({ isOpen: true }))

    expect(screen.getByText("Install AWS CLI v2")).toBeInTheDocument()
  })
})
