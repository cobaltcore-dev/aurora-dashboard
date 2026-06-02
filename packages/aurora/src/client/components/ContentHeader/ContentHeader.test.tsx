import { describe, it, expect, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ContentHeader } from "./ContentHeader"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const Wrapper = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("ContentHeader", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Rendering", () => {
    it("renders the title", () => {
      render(<ContentHeader title="Images" projectId="proj-123" />, { wrapper: Wrapper })
      expect(screen.getByText("Images")).toBeInTheDocument()
    })

    it("renders the project ID label", () => {
      render(<ContentHeader title="Images" projectId="proj-123" />, { wrapper: Wrapper })
      expect(screen.getByText(/Project ID/)).toBeInTheDocument()
    })

    it("renders the project ID value", () => {
      render(<ContentHeader title="Images" projectId="proj-123" />, { wrapper: Wrapper })
      expect(screen.getByText("proj-123")).toBeInTheDocument()
    })

    it("truncates a long project ID", () => {
      render(<ContentHeader title="Flavors" projectId="a-very-long-project-id-value" />, { wrapper: Wrapper })
      expect(screen.getByText("a-very-long-pro...")).toBeInTheDocument()
    })

    it("renders actions when provided", () => {
      render(<ContentHeader title="Images" projectId="proj-123" actions={<button>Edit</button>} />, {
        wrapper: Wrapper,
      })
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    })

    it("renders no actions slot when actions is omitted", () => {
      const { container } = render(<ContentHeader title="Images" projectId="proj-123" />, { wrapper: Wrapper })
      expect(container.querySelector(".justify-end")).not.toBeInTheDocument()
    })
  })
})
