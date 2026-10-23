import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { act, ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Secret } from "@/server/KeyManager/types/keyManager"
import { SecretListContainer } from "./SecretListContainer"

vi.mock("./SecretTableRow", () => ({
  SecretTableRow: ({ secret }: { secret: Secret }) => (
    <div role="row" data-testid={`secret-row-${secret.secret_ref}`}>
      {secret.name}
    </div>
  ),
}))

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeSecret = (ref: string, name: string): Secret => ({
  secret_ref: ref,
  name,
  status: "ACTIVE",
  algorithm: null,
  bit_length: null,
  mode: null,
  secret_type: "opaque",
  content_types: null,
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  expiration: null,
})

const mockSecrets = [makeSecret("secret-1", "db-password"), makeSecret("secret-2", "api-key")]

const defaultProps = {
  isLoading: false,
  isError: false,
  error: null,
  canDelete: true,
  onShowDetails: vi.fn(),
  onDelete: vi.fn(),
}

describe("SecretListContainer", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Columns", () => {
    it("renders the column headers in spec order (status right after the primary column)", () => {
      render(<SecretListContainer secrets={mockSecrets} {...defaultProps} />, { wrapper: TestWrapper })

      const headers = screen.getAllByRole("columnheader")
      // Name / ID, Status, Type, Content Types, actions
      expect(headers).toHaveLength(5)
      expect(headers[0]).toHaveTextContent("Name / ID")
      expect(headers[1]).toHaveTextContent("Status")
      expect(headers[2]).toHaveTextContent("Type")
      expect(headers[3]).toHaveTextContent("Content Types")
    })
  })

  describe("Data state", () => {
    it("renders a row for each secret", () => {
      render(<SecretListContainer secrets={mockSecrets} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("secret-row-secret-1")).toBeInTheDocument()
      expect(screen.getByTestId("secret-row-secret-2")).toBeInTheDocument()
      expect(screen.getAllByRole("row")).toHaveLength(3) // header + 2 data rows
    })
  })

  describe("Loading state", () => {
    it("renders a progress status while loading", () => {
      render(<SecretListContainer secrets={[]} {...defaultProps} isLoading />, { wrapper: TestWrapper })

      expect(screen.getByText("Loading Secrets...")).toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("renders the error message when the request failed", () => {
      render(<SecretListContainer secrets={[]} {...defaultProps} isError error={{ message: "Boom" }} />, {
        wrapper: TestWrapper,
      })

      expect(screen.getByText("Boom")).toBeInTheDocument()
    })

    it("falls back to a generic error message", () => {
      render(<SecretListContainer secrets={[]} {...defaultProps} isError error={null} />, { wrapper: TestWrapper })

      expect(screen.getByText("Failed to Load Secrets")).toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders the empty state when there are no secrets", () => {
      render(<SecretListContainer secrets={[]} {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByText("No Secrets Found")).toBeInTheDocument()
    })
  })
})
