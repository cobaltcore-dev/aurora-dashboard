import { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { StorageNotFound } from "./StorageNotFound"

const mockNavigate = vi.fn()
const mockHistoryBack = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useRouter: () => ({
    history: {
      back: mockHistoryBack,
    },
  }),
}))

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("StorageNotFound", () => {
  beforeEach(() => {
    i18n.activate("en")
    mockNavigate.mockClear()
    mockHistoryBack.mockClear()
  })

  it("renders a 404 with a storage-specific message", () => {
    render(<StorageNotFound projectId="proj-1" />, { wrapper: TestingProvider })

    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Storage Not Found")).toBeInTheDocument()
    expect(screen.getByText("The storage type you're looking for doesn't exist.")).toBeInTheDocument()
  })

  it("navigates to the project overview when Home is clicked", () => {
    render(<StorageNotFound projectId="proj-1" />, { wrapper: TestingProvider })

    fireEvent.click(screen.getByText("Home"))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "proj-1" },
    })
  })

  it("goes back in history when Back is clicked", () => {
    render(<StorageNotFound projectId="proj-1" />, { wrapper: TestingProvider })

    fireEvent.click(screen.getByText("Back"))

    expect(mockHistoryBack).toHaveBeenCalledTimes(1)
  })
})
