import { cleanup, render, screen } from "@testing-library/react"
import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { act, type ReactNode } from "react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { NameIdCell } from "./NameIdCell"

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const link = (text: string) => <a href="/detail/id-1">{text}</a>

describe("NameIdCell", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => cleanup())

  describe("without a link", () => {
    it("shows the name on top and the copyable ID beneath", () => {
      render(<NameIdCell name="my-resource" id="id-1" />, { wrapper: TestWrapper })

      expect(screen.getByText("my-resource")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /copy id-1 to clipboard/i })).toBeInTheDocument()
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })

    it("falls back to the placeholder when the name is empty", () => {
      render(<NameIdCell name="" id="id-1" />, { wrapper: TestWrapper })

      expect(screen.getByText("- -")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /copy id-1 to clipboard/i })).toBeInTheDocument()
    })
  })

  describe("with a link", () => {
    it("links the name and keeps the copyable ID beneath", () => {
      render(<NameIdCell name="my-resource" id="id-1" renderLink={link} />, { wrapper: TestWrapper })

      expect(screen.getByRole("link", { name: "my-resource" })).toHaveAttribute("href", "/detail/id-1")
      expect(screen.getByRole("button", { name: /copy id-1 to clipboard/i })).toBeInTheDocument()
    })

    it("links the ID and shows the placeholder when the name is empty", () => {
      render(<NameIdCell name={null} id="id-1" renderLink={link} />, { wrapper: TestWrapper })

      expect(screen.getByText("- -")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "id-1" })).toHaveAttribute("href", "/detail/id-1")
      expect(screen.getByRole("button", { name: /copy id-1 to clipboard/i })).toBeInTheDocument()
    })
  })
})
