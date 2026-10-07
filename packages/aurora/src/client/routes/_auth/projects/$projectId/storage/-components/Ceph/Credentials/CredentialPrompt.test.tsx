import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { CredentialPrompt } from "./CredentialPrompt"

const renderCredentialPrompt = ({ onManageCredentials = vi.fn() }: { onManageCredentials?: () => void } = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CredentialPrompt onManageCredentials={onManageCredentials} />
      </PortalProvider>
    </I18nProvider>
  )

describe("CredentialPrompt", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("renders setup prompt with correct title", () => {
    renderCredentialPrompt()
    expect(screen.getByText("S3 Object Storage: Setup Required")).toBeInTheDocument()
  })

  test("renders explanatory text about access keys", () => {
    renderCredentialPrompt()
    expect(screen.getByText(/requires an access key/)).toBeInTheDocument()
  })

  test("renders a single Manage Credentials button", () => {
    renderCredentialPrompt()
    expect(screen.getByRole("button", { name: "Manage Credentials" })).toBeInTheDocument()
  })

  test("calls onManageCredentials when the button is clicked", async () => {
    const user = userEvent.setup()
    const onManageCredentials = vi.fn()
    renderCredentialPrompt({ onManageCredentials })

    await user.click(screen.getByRole("button", { name: "Manage Credentials" }))

    expect(onManageCredentials).toHaveBeenCalledTimes(1)
  })

  // The same component the bucket list's other full-page states are built from. `status="empty"`
  // is what makes the container a `role="status"`; `"error"` would render a `role="alert"`, which
  // is not what "you have not set this up yet" is.
  test("renders as a Status with role=status, not an alert", () => {
    const { container } = renderCredentialPrompt()
    const status = container.querySelector(".juno-status")

    expect(status).toBeInTheDocument()
    expect(status).toHaveAttribute("role", "status")
  })

  test("the button sits in the Status action area", () => {
    const { container } = renderCredentialPrompt()

    expect(container.querySelector(".juno-status-action")).toContainElement(
      screen.getByRole("button", { name: "Manage Credentials" })
    )
  })
})
