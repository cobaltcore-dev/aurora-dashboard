import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { getFlavorCreatedToast, getFlavorDeletedToast } from "./FlavorToastNotifications"

const renderToast = ({ message, description }: ReturnType<typeof getFlavorCreatedToast>) => {
  const renderedDescription = typeof description === "function" ? description() : description

  return render(
    <I18nProvider i18n={i18n}>
      <div>{message}</div>
      <div>{renderedDescription}</div>
    </I18nProvider>
  )
}

describe("FlavorToastNotifications", () => {
  it("renders the flavor-created toast", () => {
    i18n.activate("en")

    renderToast(getFlavorCreatedToast("small"))

    expect(screen.getByText("Flavor Created")).toBeInTheDocument()
    expect(screen.getByText('Flavor "small" was successfully created.')).toBeInTheDocument()
  })

  it("renders the flavor-deleted toast", () => {
    i18n.activate("en")

    renderToast(getFlavorDeletedToast("small"))

    expect(screen.getByText("Flavor Deleted")).toBeInTheDocument()
    expect(screen.getByText('Flavor "small" was successfully deleted.')).toBeInTheDocument()
  })
})
