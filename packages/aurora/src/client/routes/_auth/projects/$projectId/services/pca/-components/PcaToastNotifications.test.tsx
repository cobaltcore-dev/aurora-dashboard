import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { getPcaDeletedToast, getCertificateImportedToast } from "./PcaToastNotifications"

// `description` is typed `(() => ReactNode) | ReactNode`, so resolve the function form before rendering.
const renderNotification = (notification: ReturnType<typeof getPcaDeletedToast>) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("PcaToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  describe("getPcaDeletedToast", () => {
    it("renders the message and the CA name in the description", () => {
      renderNotification(getPcaDeletedToast("my-ca.example.com"))
      expect(screen.getByText("Certificate Authority Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-ca\.example\.com/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })
  })

  describe("getCertificateImportedToast", () => {
    it("renders the message and description", () => {
      renderNotification(getCertificateImportedToast())
      expect(screen.getByText("Certificate Imported")).toBeInTheDocument()
      expect(screen.getByText(/was successfully imported/)).toBeInTheDocument()
    })
  })
})
