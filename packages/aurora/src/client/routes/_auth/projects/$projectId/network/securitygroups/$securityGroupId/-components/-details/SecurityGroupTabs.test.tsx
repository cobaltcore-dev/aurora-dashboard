import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import { SecurityGroupTabs } from "./SecurityGroupTabs"

const Wrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("SecurityGroupTabs", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders the Rules and RBAC Policies tabs", () => {
    render(<SecurityGroupTabs activeTab="rules" onTabChange={vi.fn()} />, { wrapper: Wrapper })

    expect(screen.getByRole("button", { name: "Rules" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "RBAC Policies" })).toBeInTheDocument()
  })

  it("marks the active tab", () => {
    render(<SecurityGroupTabs activeTab="rbac" onTabChange={vi.fn()} />, { wrapper: Wrapper })

    expect(screen.getByRole("button", { name: "RBAC Policies" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: "Rules" })).not.toHaveAttribute("aria-selected")
  })

  it("follows activeTab after a tab has been clicked", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SecurityGroupTabs activeTab="rules" onTabChange={vi.fn()} />, { wrapper: Wrapper })

    await user.click(screen.getByRole("button", { name: "RBAC Policies" }))
    rerender(<SecurityGroupTabs activeTab="rbac" onTabChange={vi.fn()} />)
    // The parent switches back without a click, e.g. when the tab is reset
    rerender(<SecurityGroupTabs activeTab="rules" onTabChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Rules" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("button", { name: "RBAC Policies" })).not.toHaveAttribute("aria-selected")
  })

  it("reports the clicked tab", async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<SecurityGroupTabs activeTab="rules" onTabChange={onTabChange} />, { wrapper: Wrapper })

    await user.click(screen.getByRole("button", { name: "RBAC Policies" }))

    expect(onTabChange).toHaveBeenCalledWith("rbac")
  })

  it("hides the RBAC Policies tab when it is not allowed", () => {
    render(<SecurityGroupTabs activeTab="rules" onTabChange={vi.fn()} showRBACTab={false} />, { wrapper: Wrapper })

    expect(screen.getByRole("button", { name: "Rules" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "RBAC Policies" })).not.toBeInTheDocument()
  })
})
