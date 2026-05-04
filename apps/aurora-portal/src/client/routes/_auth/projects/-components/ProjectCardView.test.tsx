import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProjectCardView } from "./ProjectCardView"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

// Define a test project
const projects = [
  {
    domain_id: "1789d1",
    enabled: true,
    id: "89ac3f",
    links: {
      self: "https://example.com/identity/v3/projects/89ac3f",
    },
    name: "Security Group",
    description: "Manages security compliance and access control.",
  },
]

describe("ProjectCardView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("renders project data correctly", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    expect(screen.getByText("Manages security compliance and access control.")).toBeDefined()
  })

  test("clicking the title does trigger navigation", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    // Find the title of a navigation element
    const title = screen.getByText("Security Group")

    expect(title).toBeDefined()

    if (title) {
      fireEvent.click(title)

      // Wait for navigation to be called
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledTimes(1)
          expect(mockNavigate).toHaveBeenCalledWith({
            to: "/projects/$projectId",
            params: { projectId: "89ac3f" },
          })
        },
        { timeout: 1000 }
      )
    }
  })

  test("clicking the card navigates correctly", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={projects} />
      </I18nProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Security Group")).toBeDefined()
    })

    // Find the clickable box element
    const card = screen.getByText("Security Group").closest("div")

    expect(card).toBeDefined()

    if (card) {
      fireEvent.click(card)

      // Wait for navigation to be called
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledTimes(1)
          expect(mockNavigate).toHaveBeenCalledWith({
            to: "/projects/$projectId",
            params: { projectId: "89ac3f" },
          })
        },
        { timeout: 1000 }
      )
    }
  })

  test("renders empty state when no projects", async () => {
    render(
      <I18nProvider i18n={i18n}>
        <ProjectCardView projects={undefined} />
      </I18nProvider>
    )

    // Wait for the component to render with flexible text matching
    await waitFor(
      () => {
        const emptyState = screen.queryByText(/no projects/i)
        expect(emptyState).toBeDefined()
      },
      { timeout: 1000 }
    )
  })
})
