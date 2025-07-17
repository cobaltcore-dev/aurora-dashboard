import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HelpTooltip from "./HelpTooltip"

describe("HelpTooltip", () => {
  it("renders the help icon", () => {
    render(<HelpTooltip tooltipText="Help text" />)

    // The Icon component renders as SVG with role="img"
    const helpIcon = screen.getByRole("img", { name: "Help" })
    expect(helpIcon).toBeInTheDocument()
  })

  it("renders without tooltipText prop", () => {
    render(<HelpTooltip />)

    const helpIcon = screen.getByRole("img", { name: "Help" })
    expect(helpIcon).toBeInTheDocument()
  })

  it("tooltip content is initially not visible", () => {
    const tooltipText = "This is helpful information"
    render(<HelpTooltip tooltipText={tooltipText} />)

    // Initially tooltip should not be visible
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })

  it("displays tooltip content on hover", async () => {
    const tooltipText = "This is helpful information"

    render(<HelpTooltip tooltipText={tooltipText} />)

    const helpIcon = screen.getByRole("img", { name: "Help" })

    // Since triggerEvent is set to "hover" in HelpTooltip
    await userEvent.hover(helpIcon)

    // Wait for tooltip to appear
    await waitFor(() => {
      expect(screen.getByText(tooltipText)).toBeInTheDocument()
    })
  })

  it("hides tooltip content when not hovering", async () => {
    const tooltipText = "This is helpful information"

    render(<HelpTooltip tooltipText={tooltipText} />)

    const helpIcon = screen.getByRole("img", { name: "Help" })

    // Initially tooltip should not be visible
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    // Hover to show tooltip
    await userEvent.hover(helpIcon)
    await waitFor(() => {
      expect(screen.getByText(tooltipText)).toBeInTheDocument()
    })

    // Unhover to hide tooltip
    await userEvent.unhover(helpIcon)
    await waitFor(() => {
      expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
    })
  })

  it("icon has correct data-state attribute when closed", () => {
    render(<HelpTooltip tooltipText="Help text" />)

    const helpIcon = screen.getByRole("img", { name: "Help" })
    expect(helpIcon).toHaveAttribute("data-state", "closed")
  })

  it("icon has correct data-state attribute when open", async () => {
    render(<HelpTooltip tooltipText="Help text" />)

    const helpIcon = screen.getByRole("img", { name: "Help" })

    await userEvent.hover(helpIcon)

    await waitFor(() => {
      expect(helpIcon).toHaveAttribute("data-state", "open")
    })
  })

  it("renders multiple instances independently", async () => {
    const tooltipText1 = "First help text"
    const tooltipText2 = "Second help text"

    render(
      <div>
        <HelpTooltip tooltipText={tooltipText1} />
        <HelpTooltip tooltipText={tooltipText2} />
      </div>
    )

    const helpIcons = screen.getAllByRole("img", { name: "Help" })
    expect(helpIcons).toHaveLength(2)

    // Initially, neither tooltip should be visible
    expect(screen.queryByText(tooltipText1)).not.toBeInTheDocument()
    expect(screen.queryByText(tooltipText2)).not.toBeInTheDocument()

    // Hover over first icon
    await userEvent.hover(helpIcons[0])
    await waitFor(() => {
      expect(screen.getByText(tooltipText1)).toBeInTheDocument()
    })
    expect(screen.queryByText(tooltipText2)).not.toBeInTheDocument()

    // Unhover first and hover second
    await userEvent.unhover(helpIcons[0])
    await waitFor(() => {
      expect(screen.queryByText(tooltipText1)).not.toBeInTheDocument()
    })

    await userEvent.hover(helpIcons[1])
    await waitFor(() => {
      expect(screen.getByText(tooltipText2)).toBeInTheDocument()
    })
  })

  it("displays tooltip content on click", async () => {
    const tooltipText = "Click triggered help text"

    render(<HelpTooltip tooltipText={tooltipText} />)

    const helpIcon = screen.getByRole("img", { name: "Help" })

    // Click the icon
    await userEvent.click(helpIcon)

    // Should show tooltip on click as well (based on Tooltip component behavior)
    await waitFor(() => {
      expect(screen.getByText(tooltipText)).toBeInTheDocument()
    })
  })
})
