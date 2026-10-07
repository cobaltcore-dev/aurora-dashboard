import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getCredentialCreatedToast,
  getCredentialDeletedToast,
  getCredentialDeleteErrorToast,
} from "./CredentialToastNotifications"

type CredentialNotification = ReturnType<typeof getCredentialDeletedToast>

const renderNotification = (notification: CredentialNotification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("CredentialToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  describe("getCredentialCreatedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getCredentialCreatedToast("AKIAIOSFODNN7EXAMPLE")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("names the access key and where to find it again", () => {
      renderNotification(getCredentialCreatedToast("AKIAIOSFODNN7EXAMPLE"))
      expect(screen.getByText("Access key created")).toBeInTheDocument()
      expect(screen.getByText(/AKIAIOSFODNN7EXAMPLE/)).toBeInTheDocument()
      // The point of the message: the route back to the modal, not just "it worked".
      expect(screen.getByText(/More Actions, Manage Credentials/)).toBeInTheDocument()
    })

    it("stays on screen longer than the default toast", () => {
      // Juno's NotificationManager default is 4000ms.
      expect(getCredentialCreatedToast("AKIAIOSFODNN7EXAMPLE").duration).toBeGreaterThan(4000)
    })
  })

  describe("getCredentialDeletedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getCredentialDeletedToast("AKIAIOSFODNN7EXAMPLE")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getCredentialDeletedToast("AKIAIOSFODNN7EXAMPLE"))
      expect(screen.getByText("Access key deleted")).toBeInTheDocument()
      expect(screen.getByText(/AKIAIOSFODNN7EXAMPLE/)).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })
  })

  describe("getCredentialDeleteErrorToast", () => {
    // Whatever the identity service answered, verbatim - not a sentence of our own. The common
    // case is the key already being gone, which used to be reported as a successful deletion.
    it("names the key and repeats the reason the server gave", () => {
      renderNotification(getCredentialDeleteErrorToast("AKIAIOSFODNN7EXAMPLE", "Credential not found"))
      expect(screen.getByText("Access key not deleted")).toBeInTheDocument()
      expect(screen.getByText(/AKIAIOSFODNN7EXAMPLE/)).toBeInTheDocument()
      expect(screen.getByText(/Credential not found/)).toBeInTheDocument()
    })

    // A failed revocation leaves the key working - not something to time out unread.
    it("stays on screen until dismissed", () => {
      expect(getCredentialDeleteErrorToast("AKIAIOSFODNN7EXAMPLE", "Forbidden").duration).toBe(Infinity)
    })
  })
})
