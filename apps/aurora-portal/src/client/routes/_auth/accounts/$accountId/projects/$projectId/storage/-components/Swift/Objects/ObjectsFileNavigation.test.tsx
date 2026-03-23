import React from "react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"

// ─── Render helper ────────────────────────────────────────────────────────────

const renderNav = ({
  containerName = "my-container",
  currentPrefix = "",
  onContainersClick = vi.fn(),
  onPrefixClick = vi.fn(),
}: {
  containerName?: string
  currentPrefix?: string
  onContainersClick?: () => void
  onPrefixClick?: (prefix: string) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ObjectsFileNavigation
          containerName={containerName}
          currentPrefix={currentPrefix}
          onContainersClick={onContainersClick}
          onPrefixClick={onPrefixClick}
        />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ObjectsFileNavigation", () => {
  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Root level (no prefix)", () => {
    test("renders All containers crumb", () => {
      renderNav()
      expect(screen.getByText("All containers")).toBeInTheDocument()
    })

    test("renders container name as active crumb", () => {
      renderNav({ containerName: "my-container" })
      expect(screen.getByText("my-container")).toBeInTheDocument()
    })

    test("calls onContainersClick when All containers is clicked", async () => {
      const user = userEvent.setup()
      const onContainersClick = vi.fn()
      renderNav({ onContainersClick })
      await user.click(screen.getByText("All containers"))
      expect(onContainersClick).toHaveBeenCalledOnce()
    })

    test("does not render any prefix segment crumbs at root", () => {
      renderNav({ currentPrefix: "" })
      // The active (last) crumb may not be a link — check overall text content
      expect(screen.getByText("All containers")).toBeInTheDocument()
      expect(screen.queryByText("subfolder")).not.toBeInTheDocument()
    })
  })

  describe("Single-level prefix", () => {
    test("renders the prefix segment as active crumb", () => {
      renderNav({ currentPrefix: "photos/" })
      expect(screen.getByText("photos")).toBeInTheDocument()
    })

    test("container name becomes clickable when inside a prefix", async () => {
      const user = userEvent.setup()
      const onPrefixClick = vi.fn()
      renderNav({ currentPrefix: "photos/", onPrefixClick })
      await user.click(screen.getByText("my-container"))
      // Clicking container navigates to root prefix ("")
      expect(onPrefixClick).toHaveBeenCalledWith("")
    })
  })

  describe("Multi-level prefix", () => {
    test("renders all intermediate segments as clickable crumbs", () => {
      renderNav({ currentPrefix: "a/b/c/" })
      expect(screen.getByText("a")).toBeInTheDocument()
      expect(screen.getByText("b")).toBeInTheDocument()
      expect(screen.getByText("c")).toBeInTheDocument()
    })

    test("clicking an intermediate segment calls onPrefixClick with correct prefix", async () => {
      const user = userEvent.setup()
      const onPrefixClick = vi.fn()
      renderNav({ currentPrefix: "a/b/c/", onPrefixClick })
      // "a" is the first intermediate — clicking it should navigate to "a/"
      await user.click(screen.getByText("a"))
      expect(onPrefixClick).toHaveBeenCalledWith("a/")
    })

    test("last segment is active and does not call onPrefixClick when clicked", async () => {
      const user = userEvent.setup()
      const onPrefixClick = vi.fn()
      renderNav({ currentPrefix: "a/b/c/", onPrefixClick })
      // "c" is the last (active) segment — it has no onClick
      const cEl = screen.getByText("c")
      await user.click(cEl)
      // onPrefixClick should NOT have been called for the active crumb
      expect(onPrefixClick).not.toHaveBeenCalledWith("a/b/c/")
    })
  })
})
