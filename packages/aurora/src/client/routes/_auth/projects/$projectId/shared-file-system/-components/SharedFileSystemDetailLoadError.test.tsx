import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { SharedFileSystemDetailLoadError } from "./SharedFileSystemDetailLoadError"

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: "proj-1" }),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("SharedFileSystemDetailLoadError", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders NOT_FOUND error with the given notFoundTitle and notFoundDescription", () => {
    const error = { data: { code: "NOT_FOUND" } }
    const onRetry = vi.fn()

    render(
      <SharedFileSystemDetailLoadError
        error={error}
        onRetry={onRetry}
        notFoundTitle="Resource Not Found"
        notFoundDescription="This resource does not exist."
        forbiddenDescription="Forbidden."
        errorTitle="Error Loading Resource"
        errorDescription="The resource could not be loaded."
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Resource Not Found")).toBeInTheDocument()
    expect(screen.getByText("This resource does not exist.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders FORBIDDEN error with the given forbiddenDescription", () => {
    const error = { data: { code: "FORBIDDEN" } }
    const onRetry = vi.fn()

    render(
      <SharedFileSystemDetailLoadError
        error={error}
        onRetry={onRetry}
        notFoundTitle="Resource Not Found"
        notFoundDescription="This resource does not exist."
        forbiddenDescription="You don't have permission."
        errorTitle="Error Loading Resource"
        errorDescription="The resource could not be loaded."
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(screen.getByText("You don't have permission.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders generic error with the given errorTitle and errorDescription", () => {
    const error = { data: { code: "INTERNAL_SERVER_ERROR" } }
    const onRetry = vi.fn()

    render(
      <SharedFileSystemDetailLoadError
        error={error}
        onRetry={onRetry}
        notFoundTitle="Resource Not Found"
        notFoundDescription="This resource does not exist."
        forbiddenDescription="Forbidden."
        errorTitle="Error Loading Resource"
        errorDescription="The resource could not be loaded."
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.getByText("Error Loading Resource")).toBeInTheDocument()
    expect(screen.getByText("The resource could not be loaded.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
  })

  it("navigates to Home when Home button is clicked", async () => {
    const user = userEvent.setup()
    const error = { data: { code: "NOT_FOUND" } }
    const onRetry = vi.fn()

    render(
      <SharedFileSystemDetailLoadError
        error={error}
        onRetry={onRetry}
        notFoundTitle="Resource Not Found"
        notFoundDescription="This resource does not exist."
        forbiddenDescription="Forbidden."
        errorTitle="Error Loading Resource"
        errorDescription="The resource could not be loaded."
      />,
      { wrapper: TestWrapper }
    )

    const homeButton = screen.getByRole("button", { name: "Home" })
    await user.click(homeButton)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "proj-1" },
    })
  })

  it("does not render raw error.message", () => {
    const error = { message: "upstream boom 500", data: { code: "INTERNAL_SERVER_ERROR" } }
    const onRetry = vi.fn()

    render(
      <SharedFileSystemDetailLoadError
        error={error}
        onRetry={onRetry}
        notFoundTitle="Resource Not Found"
        notFoundDescription="This resource does not exist."
        forbiddenDescription="Forbidden."
        errorTitle="Error Loading Resource"
        errorDescription="The resource could not be loaded."
      />,
      { wrapper: TestWrapper }
    )

    expect(screen.queryByText("upstream boom 500")).not.toBeInTheDocument()
  })

  describe("backTarget prop", () => {
    it("navigates to share-networks when backTarget is 'share-networks' (NOT_FOUND)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "NOT_FOUND" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Share Network Not Found"
          notFoundDescription="This share network does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Share Network"
          errorDescription="The share network could not be loaded."
          backTarget="share-networks"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Share Networks")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Share Networks" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/share-networks",
        params: { projectId: "proj-1" },
      })
    })

    it("navigates to share-networks when backTarget is 'share-networks' (UNAUTHORIZED)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "UNAUTHORIZED" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Share Network Not Found"
          notFoundDescription="This share network does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Share Network"
          errorDescription="The share network could not be loaded."
          backTarget="share-networks"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Share Networks")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Share Networks" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/share-networks",
        params: { projectId: "proj-1" },
      })
    })

    it("navigates to share-networks when backTarget is 'share-networks' (generic error)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "INTERNAL_SERVER_ERROR" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Share Network Not Found"
          notFoundDescription="This share network does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Share Network"
          errorDescription="The share network could not be loaded."
          backTarget="share-networks"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Share Networks")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Share Networks" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/share-networks",
        params: { projectId: "proj-1" },
      })
    })

    it("defaults to 'shares' when backTarget is omitted", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "NOT_FOUND" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Resource Not Found"
          notFoundDescription="This resource does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Resource"
          errorDescription="The resource could not be loaded."
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Shares")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Shares" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system",
        params: { projectId: "proj-1" },
      })
    })

    it("navigates to security-services when backTarget is 'security-services' (NOT_FOUND)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "NOT_FOUND" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Security Service Not Found"
          notFoundDescription="This security service does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Security Service"
          errorDescription="The security service could not be loaded."
          backTarget="security-services"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Security Services")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Security Services" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/security-services",
        params: { projectId: "proj-1" },
      })
    })

    it("navigates to security-services when backTarget is 'security-services' (UNAUTHORIZED)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "UNAUTHORIZED" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Security Service Not Found"
          notFoundDescription="This security service does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Security Service"
          errorDescription="The security service could not be loaded."
          backTarget="security-services"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Security Services")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Security Services" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/security-services",
        params: { projectId: "proj-1" },
      })
    })

    it("navigates to security-services when backTarget is 'security-services' (generic error)", async () => {
      const user = userEvent.setup()
      const error = { data: { code: "INTERNAL_SERVER_ERROR" } }
      const onRetry = vi.fn()

      render(
        <SharedFileSystemDetailLoadError
          error={error}
          onRetry={onRetry}
          notFoundTitle="Security Service Not Found"
          notFoundDescription="This security service does not exist."
          forbiddenDescription="Forbidden."
          errorTitle="Error Loading Security Service"
          errorDescription="The security service could not be loaded."
          backTarget="security-services"
        />,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText("Back to Security Services")).toBeInTheDocument()
      const backButton = screen.getByRole("button", { name: "Back to Security Services" })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/projects/$projectId/shared-file-system/security-services",
        params: { projectId: "proj-1" },
      })
    })
  })
})
