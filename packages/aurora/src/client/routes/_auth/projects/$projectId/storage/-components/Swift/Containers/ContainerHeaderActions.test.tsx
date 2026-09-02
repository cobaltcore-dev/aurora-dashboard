import { describe, test, expect, vi, beforeAll } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ContainerHeaderActions, type ContainerModalType } from "./ContainerHeaderActions"

const renderActions = (onOpenModal = vi.fn()) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ContainerHeaderActions onOpenModal={onOpenModal} />
      </PortalProvider>
    </I18nProvider>
  )

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Container actions" }))
}

describe("ContainerHeaderActions", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  test("toggle button renders with the accessible name 'Container actions'", () => {
    renderActions()
    expect(screen.getByRole("button", { name: "Container actions" })).toBeInTheDocument()
  })

  test("all four items are present after opening the menu", async () => {
    const user = userEvent.setup()
    renderActions()
    await openMenu(user)

    expect(screen.getByTestId("container-actions-manage-access")).toBeInTheDocument()
    expect(screen.getByTestId("container-actions-edit-metadata")).toBeInTheDocument()
    expect(screen.getByTestId("container-actions-empty")).toBeInTheDocument()
    expect(screen.getByTestId("container-actions-delete")).toBeInTheDocument()
  })

  test("items appear in the agreed order: Manage Access, Preview and Edit metadata, Empty Container, Delete Container", async () => {
    const user = userEvent.setup()
    renderActions()
    await openMenu(user)

    const items = screen.getAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Manage Access",
      "Preview and Edit metadata",
      "Empty Container",
      "Delete Container",
    ])
  })

  test.each<[string, ContainerModalType]>([
    ["container-actions-manage-access", "manageAccess"],
    ["container-actions-edit-metadata", "editMetadata"],
    ["container-actions-empty", "emptyContainer"],
    ["container-actions-delete", "deleteContainer"],
  ])("clicking %s invokes onOpenModal with '%s'", async (testId, expectedModal) => {
    const onOpenModal = vi.fn()
    const user = userEvent.setup()
    renderActions(onOpenModal)
    await openMenu(user)

    await user.click(screen.getByTestId(testId))

    expect(onOpenModal).toHaveBeenCalledTimes(1)
    expect(onOpenModal).toHaveBeenCalledWith(expectedModal)
  })
})
