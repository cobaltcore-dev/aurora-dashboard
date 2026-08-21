import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { BucketDetailTabs } from "./BucketDetailTabs"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

// Mock the Route hooks
vi.mock("@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects", () => ({
  Route: {
    useNavigate: vi.fn(),
    useSearch: vi.fn(),
  },
}))

const Wrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("BucketDetailTabs", () => {
  const mockNavigate = vi.fn()

  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Route.useNavigate).mockReturnValue(mockNavigate)
  })

  it("renders all three tab labels", () => {
    vi.mocked(Route.useSearch).mockReturnValue({ view: "overview" } as never)

    render(<BucketDetailTabs />, { wrapper: Wrapper })

    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("CORS Rules")).toBeInTheDocument()
    expect(screen.getByText("Lifecycle Rules")).toBeInTheDocument()
  })

  it("marks Overview as active by default", () => {
    vi.mocked(Route.useSearch).mockReturnValue({ view: "overview" } as never)

    render(<BucketDetailTabs />, { wrapper: Wrapper })

    const overviewTab = screen.getByText("Overview").closest("button")
    expect(overviewTab).toHaveClass("juno-navigation-item-active")
  })

  it("marks CORS Rules as active when view=cors-rules", () => {
    vi.mocked(Route.useSearch).mockReturnValue({ view: "cors-rules" } as never)

    render(<BucketDetailTabs />, { wrapper: Wrapper })

    const corsTab = screen.getByText("CORS Rules").closest("button")
    expect(corsTab).toHaveClass("juno-navigation-item-active")
  })

  it("marks Lifecycle Rules as active when view=lifecycle-rules", () => {
    vi.mocked(Route.useSearch).mockReturnValue({ view: "lifecycle-rules" } as never)

    render(<BucketDetailTabs />, { wrapper: Wrapper })

    const lifecycleTab = screen.getByText("Lifecycle Rules").closest("button")
    expect(lifecycleTab).toHaveClass("juno-navigation-item-active")
  })

  it("calls navigate with merged search params when clicking inactive tab", async () => {
    const { default: userEvent } = await import("@testing-library/user-event")
    const user = userEvent.setup()

    // Start with overview active, with some existing search params
    vi.mocked(Route.useSearch).mockReturnValue({
      view: "overview",
      prefix: "folder/",
      sortBy: "name",
      search: "test",
      tab: "all",
    } as never)

    render(<BucketDetailTabs />, { wrapper: Wrapper })

    // Click on Lifecycle Rules tab
    const lifecycleTab = screen.getByText("Lifecycle Rules")
    await user.click(lifecycleTab)

    // Should call navigate with view changed but other params preserved
    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    })

    // Verify the search function preserves other params
    const searchFn = mockNavigate.mock.calls[0][0].search
    const result = searchFn({
      view: "overview",
      prefix: "folder/",
      sortBy: "name",
      search: "test",
      tab: "all",
    })

    expect(result).toEqual({
      view: "lifecycle-rules",
      prefix: "folder/",
      sortBy: "name",
      search: "test",
      tab: "all",
    })
  })
})
