import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { ProjectInfoBox } from "./ProjectInfoBox"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <PortalProvider>
    <I18nProvider i18n={i18n}>{children}</I18nProvider>
  </PortalProvider>
)

describe("ProjectInfoBox", () => {
  const defaultProps = {
    pageTitle: "Test Project",
    projectInfo: {
      id: "project-123",
      name: "My Project",
      description: "This is a description.",
      domain: {
        name: "my-domain.com",
      },
    },
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

  describe("Rendering", () => {
    it("renders page title", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ProjectInfoBox {...defaultProps} />
          </TestingProvider>
        )
      })

      expect(screen.getByText("Test Project")).toBeInTheDocument()
    })

    it("renders project ID", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ProjectInfoBox {...defaultProps} />
          </TestingProvider>
        )
      })

      expect(screen.getByText(/Project ID:/)).toBeInTheDocument()
      expect(screen.getByText(/project-123/)).toBeInTheDocument()
    })

    it("renders project name", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ProjectInfoBox {...defaultProps} />
          </TestingProvider>
        )
      })

      expect(screen.getByText(/Project Name:/)).toBeInTheDocument()
      expect(screen.getByText(/My Project/)).toBeInTheDocument()
    })

    it("renders domain name if available", async () => {
      await act(async () => {
        render(
          <TestingProvider>
            <ProjectInfoBox {...defaultProps} />
          </TestingProvider>
        )
      })

      expect(screen.getByText(/Domain Name:/)).toBeInTheDocument()
      expect(screen.getByText(/my-domain.com/)).toBeInTheDocument()
    })

    it("does not render domain name if not available", async () => {
      const propsWithoutDomain = {
        ...defaultProps,
        projectInfo: {
          ...defaultProps.projectInfo,
          domain: undefined,
        },
      }

      await act(async () => {
        render(
          <TestingProvider>
            <ProjectInfoBox {...propsWithoutDomain} />
          </TestingProvider>
        )
      })

      expect(screen.queryByText(/Domain Name:/)).not.toBeInTheDocument()
    })
  })
})
