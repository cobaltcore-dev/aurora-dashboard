import { render, screen, fireEvent, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest"
import { ProjectsOverviewNavBar } from "./ProjectOverviewNavBar"
import { PortalProvider } from "@cloudoperators/juno-ui-components/index"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("ProjectOverviewNavBar", () => {
  const defaultProps = {
    viewMode: "list" as const,
    setViewMode: vi.fn(),
    onSearch: vi.fn(),
  }

  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders correctly with initial search term", async () => {
    await act(async () => {
      render(
        <TestingProvider>
          <ProjectsOverviewNavBar {...defaultProps} searchTerm="initial search" />
        </TestingProvider>
      )
    })
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("initial search")
  })

  it("updates local search term immediately on input change", async () => {
    await act(async () => {
      render(
        <TestingProvider>
          <ProjectsOverviewNavBar {...defaultProps} />
        </TestingProvider>
      )
    })

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test" } })

    expect(searchInput).toHaveValue("test")
  })

  it("debounces search callback", async () => {
    await act(async () => {
      render(
        <TestingProvider>
          <ProjectsOverviewNavBar {...defaultProps} />
        </TestingProvider>
      )
    })

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test" } })

    // onSearch should not be called immediately
    expect(defaultProps.onSearch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(defaultProps.onSearch).toHaveBeenCalledWith("test")
    expect(defaultProps.onSearch).toHaveBeenCalledTimes(1)
  })

  it("clears previous timeout when typing quickly", async () => {
    await act(async () => {
      render(
        <TestingProvider>
          <ProjectsOverviewNavBar {...defaultProps} />
        </TestingProvider>
      )
    })

    const searchInput = screen.getByPlaceholderText("Search...")

    fireEvent.change(searchInput, { target: { value: "te" } })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(defaultProps.onSearch).not.toHaveBeenCalled()

    // Second input change before the first debounce completes
    fireEvent.change(searchInput, { target: { value: "test" } })

    act(() => {
      vi.advanceTimersByTime(299)
    })

    // onSearch should still not be called bc of timer-reset
    expect(defaultProps.onSearch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(defaultProps.onSearch).toHaveBeenCalledWith("test")
    expect(defaultProps.onSearch).toHaveBeenCalledTimes(1)
  })
})
