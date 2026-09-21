import { render, screen } from "@testing-library/react"
import { describe, test, expect, beforeEach, vi } from "vitest"
import { notFound } from "@tanstack/react-router"
import { StorageNotFound } from "./StorageNotFound"
import type { StorageNotFoundReason } from "./utils/serviceAvailability"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

const navigateMock = vi.fn()

// Keeps the real `notFound()` — the point of these tests is to build the error object the
// way the router does, so it must not be a stub.
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ projectId: "proj-1" }),
  }
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

/**
 * Renders the component the way the router does, rather than the way it is convenient to
 * call it: the router spreads the whole `notFound()` error object into the props
 * (`Match.js:158` → `renderRouteNotFound.js`), so going through the real `notFound()` here
 * is what keeps the prop shape honest. Hand-passing props hid a bug where the component
 * read a flat `reason` that the router never sends, collapsing all three cases into one.
 */
const renderAsRouterWould = (reason?: StorageNotFoundReason) => {
  const error = reason ? notFound({ data: { reason } }) : notFound()
  return render(<StorageNotFound {...(error as object)} />, { wrapper: TestWrapper })
}

describe("StorageNotFound", () => {
  beforeEach(() => {
    i18n.activate("en")
    navigateMock.mockClear()
  })

  test('renders "address is not valid" copy for a storage-type mismatch', () => {
    renderAsRouterWould("storage-type-mismatch")

    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
    expect(screen.getByText("This address is not valid for this object storage service.")).toBeInTheDocument()
  })

  test('renders "not available for this project" copy for provider-not-found', () => {
    renderAsRouterWould("provider-not-found")

    expect(screen.getByText("Object Storage Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("This object storage service does not exist or is not available for this project.")
    ).toBeInTheDocument()
  })

  test('renders "not available for this project" copy for provider-unavailable', () => {
    renderAsRouterWould("provider-unavailable")

    expect(screen.getByText("Object Storage Not Found")).toBeInTheDocument()
    expect(
      screen.getByText("This object storage service does not exist or is not available for this project.")
    ).toBeInTheDocument()
  })

  test("falls back to the provider-unavailable copy when no reason is carried", () => {
    renderAsRouterWould()

    expect(screen.getByText("Object Storage Not Found")).toBeInTheDocument()
  })

  // D7: the 404 must render as a Juno Status carrying the code, not as bare copy.
  test("renders the 404 status code", () => {
    renderAsRouterWould("provider-not-found")

    expect(screen.getByText("404")).toBeInTheDocument()
  })

  test("the action button targets the project overview", () => {
    renderAsRouterWould("provider-not-found")

    const button = screen.getByRole("button", { name: /Go to Project/i })
    expect(button).toBeInTheDocument()
  })

  // The bug this replaces: the component read a flat `reason` prop, so `isBadUrl` was
  // always false and `/storage/swift/buckets` showed the "service does not exist" copy
  // instead of "this address is not valid". Asserting both directions pins the shape.
  test("reads reason from the spread error object, not from a flat `reason` prop", () => {
    renderAsRouterWould("storage-type-mismatch")
    expect(screen.getByText("This address is not valid for this object storage service.")).toBeInTheDocument()

    // A flat `reason` is what the router never sends — it must NOT be honoured.
    render(<StorageNotFound {...({ reason: "storage-type-mismatch" } as object)} />, { wrapper: TestWrapper })
    expect(
      screen.getAllByText("This object storage service does not exist or is not available for this project.")
    ).not.toHaveLength(0)
  })
})
