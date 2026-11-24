import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import type { ShareExportLocation } from "@/server/SharedFileSystem/types/share"
import { ShareExportLocationsTable } from "./ShareExportLocationsTable"

const mockLocation: ShareExportLocation = {
  id: "location-1",
  path: "/path/to/export",
  preferred: true,
}

const renderComponent = (props: {
  exportLocations?: ShareExportLocation[]
  isLoading?: boolean
  error?: { message?: string; data?: { code?: string } | null } | null
  canList?: boolean
  onRetry?: () => void
}) =>
  render(
    <I18nProvider i18n={i18n}>
      <ShareExportLocationsTable
        exportLocations={props.exportLocations ?? []}
        isLoading={props.isLoading ?? false}
        error={props.error ?? null}
        canList={props.canList ?? true}
        onRetry={props.onRetry ?? vi.fn()}
      />
    </I18nProvider>
  )

describe("ShareExportLocationsTable", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the 2 column headers in the correct order", () => {
    renderComponent({ exportLocations: [] })

    const headers = screen.getAllByRole("columnheader")
    expect(headers).toHaveLength(2)
    expect(headers[0]).toHaveTextContent("Path")
    expect(headers[1]).toHaveTextContent("Preferred")
  })

  it("renders export location rows with path and Yes/No", () => {
    const locations: ShareExportLocation[] = [
      { ...mockLocation, id: "loc-1", path: "/export/path/1", preferred: true },
      { ...mockLocation, id: "loc-2", path: "/export/path/2", preferred: false },
    ]

    renderComponent({ exportLocations: locations })

    expect(screen.getByText("/export/path/1")).toBeInTheDocument()
    expect(screen.getByText("/export/path/2")).toBeInTheDocument()
    expect(screen.getAllByText("Yes")).toHaveLength(1)
    expect(screen.getAllByText("No")).toHaveLength(1)
  })

  it("renders - - for missing path and preferred values", () => {
    const locations: ShareExportLocation[] = [{ ...mockLocation, id: "loc-1", path: null, preferred: null }]

    renderComponent({ exportLocations: locations })

    expect(screen.getAllByText("- -")).toHaveLength(2) // both columns
  })

  it("renders preferred locations first", () => {
    const locations: ShareExportLocation[] = [
      { ...mockLocation, id: "loc-1", path: "/path/1", preferred: false },
      { ...mockLocation, id: "loc-2", path: "/path/2", preferred: true },
      { ...mockLocation, id: "loc-3", path: "/path/3", preferred: false },
    ]

    renderComponent({ exportLocations: locations })

    const cells = screen.getAllByRole("gridcell")
    // First data row should be the preferred one
    expect(cells[0]).toHaveTextContent("/path/2")
    expect(cells[1]).toHaveTextContent("Yes")
  })

  it("renders loading state", () => {
    renderComponent({ isLoading: true })

    expect(screen.getByText("Loading Export Locations...")).toBeInTheDocument()
  })

  it("renders empty state", () => {
    renderComponent({ exportLocations: [] })

    expect(screen.getByText("No Export Locations")).toBeInTheDocument()
    expect(screen.getByText("This share has no export locations.")).toBeInTheDocument()
  })

  it("renders generic error with Try Again button", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    renderComponent({
      error: { message: "Network error" },
      onRetry,
    })

    expect(screen.getByText("Failed to Load Export Locations")).toBeInTheDocument()
    expect(screen.getByText("The export locations could not be loaded.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try Again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("renders FORBIDDEN error from server", () => {
    renderComponent({
      error: { data: { code: "FORBIDDEN" } },
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(
      screen.getByText("You don't have permission to view the export locations of this share.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders Access Denied when canList is false", () => {
    renderComponent({
      canList: false,
    })

    expect(screen.getByText("Access Denied")).toBeInTheDocument()
    expect(
      screen.getByText("You don't have permission to view the export locations of this share.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })

  it("renders UNAUTHORIZED error without Try Again button", () => {
    renderComponent({
      error: { data: { code: "UNAUTHORIZED" } },
    })

    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Your session has expired. Sign in again to view export locations.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument()
  })
})
