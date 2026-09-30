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

  test("renders content in a centered vertical stack", () => {
    const { container } = renderCredentialPrompt()
    const stack = container.querySelector(".juno-stack")
    expect(stack).toBeInTheDocument()
    expect(stack).toHaveClass("jn:flex", "jn:flex-col")
  })

  test("title uses heading style", () => {
    renderCredentialPrompt()
    const title = screen.getByText("S3 Object Storage: Setup Required")
    expect(title.tagName).toBe("H2")
  })
})
