import { ReactNode } from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ErrorPage } from "./ErrorPage"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("ErrorPage", () => {
  it("renders 404 error", () => {
    render(<ErrorPage statusCode={404} title="Page Not Found" message="The page doesn't exist" showHeader={false} />, {
      wrapper: TestingProvider,
    })

    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
  })

  it("calls onBackClick when back button clicked", async () => {
    const onBackClick = vi.fn()
    const user = userEvent.setup()

    render(
      <ErrorPage statusCode={404} title="Page Not Found" message="Test" onBackClick={onBackClick} showHeader={true} />,
      { wrapper: TestingProvider }
    )

    await user.click(screen.getByText("Back"))
    expect(onBackClick).toHaveBeenCalledOnce()
  })

  it("calls onHomeClick when home button clicked", async () => {
    const onHomeClick = vi.fn()
    const user = userEvent.setup()

    render(<ErrorPage statusCode={500} title="Error" message="Test" onHomeClick={onHomeClick} showHeader={false} />, {
      wrapper: TestingProvider,
    })

    await user.click(screen.getByText("Home"))
    expect(onHomeClick).toHaveBeenCalledOnce()
  })

  it("shows header for situations when the header is not rendered normally (errors)", () => {
    render(<ErrorPage statusCode={500} title="Server Error" message="Something went wrong" showHeader={true} />, {
      wrapper: TestingProvider,
    })

    expect(screen.queryByText("Aurora")).toBeInTheDocument()
  })

  it("hides header, for situations like 404 when its rendered normally (404)", () => {
    render(<ErrorPage statusCode={404} title="Not Found" message="Page missing" showHeader={false} />, {
      wrapper: TestingProvider,
    })

    expect(screen.queryByText("Aurora")).not.toBeInTheDocument()
    expect(screen.queryByText("404")).toBeInTheDocument()
  })
})
