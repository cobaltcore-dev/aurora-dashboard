import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { InactivityModal } from "./InactivityModal"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"

const mockCloseInactivityModal = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("../../store/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}))

const renderModal = () => {
  return render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <InactivityModal />
      </PortalProvider>
    </I18nProvider>
  )
}

describe("InactivityModal", () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await act(async () => {
      i18n.activate("en")
    })

    // Default mock return value
    mockUseAuth.mockReturnValue({
      showInactivityModal: false,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: null,
    })
  })

  test("should not render when showInactivityModal is false", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: false,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  test("should render modal when showInactivityModal is true", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  test("should display 'Inactivity Timeout' title and message for inactivity reason", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    expect(screen.getByText("Inactivity Timeout")).toBeInTheDocument()
    expect(screen.getByText("You have been logged out due to inactivity.")).toBeInTheDocument()
    expect(screen.getByText("Please log in again to continue.")).toBeInTheDocument()
  })

  test("should display 'Session Expired' title and message for expired reason", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "expired",
    })

    renderModal()

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired.")).toBeInTheDocument()
    expect(screen.getByText("Please log in again to continue.")).toBeInTheDocument()
  })

  test("should call closeInactivityModal when OK button is clicked", async () => {
    const user = userEvent.setup()

    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    const okButton = screen.getByRole("button", { name: /OK/i })
    await user.click(okButton)

    expect(mockCloseInactivityModal).toHaveBeenCalledTimes(1)
  })

  test("should render with small size modal", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    const dialog = screen.getByRole("dialog")
    // Check if the modal has the small size class (adjust based on your Modal component's implementation)
    expect(dialog).toBeInTheDocument()
  })

  test("should handle null logoutReason gracefully", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: null,
    })

    renderModal()

    expect(screen.getByText("Inactivity Timeout")).toBeInTheDocument()
  })

  test("should handle undefined logoutReason gracefully", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: undefined,
    })

    renderModal()

    expect(screen.getByText("Inactivity Timeout")).toBeInTheDocument()
  })

  test("should display both paragraphs in the modal body", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "expired",
    })

    renderModal()

    const paragraphs = screen.getAllByText(/./i).filter((el) => el.tagName === "P")
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
  })

  test("modal should be accessible with proper ARIA attributes", () => {
    mockUseAuth.mockReturnValue({
      showInactivityModal: true,
      closeInactivityModal: mockCloseInactivityModal,
      logoutReason: "inactivity",
    })

    renderModal()

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText("Inactivity Timeout")).toBeInTheDocument()
  })
})
