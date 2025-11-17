import { ReactNode } from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { NotFound } from "./NotFound"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    history: {
      back: vi.fn(),
    },
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("NotFound", () => {
  it("renders 404 page", () => {
    render(<NotFound />, { wrapper: TestingProvider })

    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
  })
})
