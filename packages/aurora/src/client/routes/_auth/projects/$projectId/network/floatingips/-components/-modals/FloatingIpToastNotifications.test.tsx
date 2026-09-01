import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getFloatingIpAllocatedToast,
  getFloatingIpUpdatedToast,
  getFloatingIpAssociatedToast,
  getFloatingIpDetachedToast,
  getFloatingIpReleasedToast,
} from "./FloatingIpToastNotifications"

type Notification = ReturnType<typeof getFloatingIpAllocatedToast>

const renderNotification = (notification: Notification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("FloatingIpToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  it("all helpers return a message and renderable description", () => {
    const notifications = [
      getFloatingIpAllocatedToast("203.0.113.1"),
      getFloatingIpUpdatedToast("203.0.113.1"),
      getFloatingIpAssociatedToast("203.0.113.1"),
      getFloatingIpDetachedToast("203.0.113.1"),
      getFloatingIpReleasedToast("203.0.113.1"),
    ]
    notifications.forEach((n) => {
      expect(n.message).toBeTruthy()
      expect(n.description).toBeTruthy()
      const view = renderNotification(n)
      view.unmount()
    })
  })

  describe("getFloatingIpAllocatedToast", () => {
    it("renders correct message and includes the IP", () => {
      renderNotification(getFloatingIpAllocatedToast("203.0.113.1"))
      expect(screen.getByText("Floating IP Allocated")).toBeInTheDocument()
      expect(screen.getByText(/203\.0\.113\.1/)).toBeInTheDocument()
      expect(screen.getByText(/successfully allocated/)).toBeInTheDocument()
    })
  })

  describe("getFloatingIpUpdatedToast", () => {
    it("renders correct message and includes the IP", () => {
      renderNotification(getFloatingIpUpdatedToast("203.0.113.2"))
      expect(screen.getByText("Floating IP Updated")).toBeInTheDocument()
      expect(screen.getByText(/203\.0\.113\.2/)).toBeInTheDocument()
      expect(screen.getByText(/successfully updated/)).toBeInTheDocument()
    })
  })

  describe("getFloatingIpAssociatedToast", () => {
    it("renders correct message and includes the IP", () => {
      renderNotification(getFloatingIpAssociatedToast("203.0.113.3"))
      expect(screen.getByText("Floating IP Associated")).toBeInTheDocument()
      expect(screen.getByText(/203\.0\.113\.3/)).toBeInTheDocument()
      expect(screen.getByText(/successfully associated/)).toBeInTheDocument()
    })
  })

  describe("getFloatingIpDetachedToast", () => {
    it("renders correct message and includes the IP", () => {
      renderNotification(getFloatingIpDetachedToast("203.0.113.4"))
      expect(screen.getByText("Floating IP Detached")).toBeInTheDocument()
      expect(screen.getByText(/203\.0\.113\.4/)).toBeInTheDocument()
      expect(screen.getByText(/successfully detached/)).toBeInTheDocument()
    })
  })

  describe("getFloatingIpReleasedToast", () => {
    it("renders correct message and includes the IP", () => {
      renderNotification(getFloatingIpReleasedToast("203.0.113.5"))
      expect(screen.getByText("Floating IP Released")).toBeInTheDocument()
      expect(screen.getByText(/203\.0\.113\.5/)).toBeInTheDocument()
      expect(screen.getByText(/successfully released/)).toBeInTheDocument()
    })
  })
})
