import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getSecurityGroupDeletedToast,
  getSecurityGroupUpdatedToast,
  getSecurityGroupRuleCreatedToast,
  getSecurityGroupRuleDeletedToast,
  getRBACPolicyAddedToast,
  getRBACPolicyDeletedToast,
} from "./SecurityGroupToastNotifications"

type Notification = ReturnType<typeof getSecurityGroupDeletedToast>

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

describe("SecurityGroupToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  describe("Notification configuration", () => {
    it("all helpers return a message and renderable description", () => {
      const notifications = [
        getSecurityGroupDeletedToast("my-sg"),
        getSecurityGroupUpdatedToast("my-sg"),
        getSecurityGroupRuleCreatedToast(),
        getSecurityGroupRuleDeletedToast(),
        getRBACPolicyAddedToast("project-abc"),
        getRBACPolicyDeletedToast("project-abc"),
      ]
      notifications.forEach((notification) => {
        expect(notification.message).toBeTruthy()
        expect(notification.description).toBeTruthy()
        const view = renderNotification(notification)
        view.unmount()
      })
    })

    it("preserves dynamic names and error messages", () => {
      renderNotification(getSecurityGroupDeletedToast("web-prod/eu"))
      expect(screen.getByText(/web-prod\/eu/)).toBeInTheDocument()

      renderNotification(getRBACPolicyAddedToast("tenant/project-42"))
      expect(screen.getByText(/tenant\/project-42/)).toBeInTheDocument()
    })
  })

  // ── Security Group operations ──────────────────────────────────────────────

  describe("getSecurityGroupDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getSecurityGroupDeletedToast("my-sg"))
      expect(screen.getByText("Security Group Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-sg/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })
  })

  describe("getSecurityGroupUpdatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getSecurityGroupUpdatedToast("my-sg"))
      expect(screen.getByText("Security Group Updated")).toBeInTheDocument()
      expect(screen.getByText(/my-sg/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully updated/)).toBeInTheDocument()
    })
  })

  // ── Rule operations ────────────────────────────────────────────────────────

  describe("getSecurityGroupRuleCreatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getSecurityGroupRuleCreatedToast())
      expect(screen.getByText("Rule Created")).toBeInTheDocument()
      expect(screen.getByText(/Security group rule was successfully created/)).toBeInTheDocument()
    })
  })

  describe("getSecurityGroupRuleDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getSecurityGroupRuleDeletedToast())
      expect(screen.getByText("Rule Deleted")).toBeInTheDocument()
      expect(screen.getByText(/Security group rule was successfully deleted/)).toBeInTheDocument()
    })
  })

  // ── RBAC Policy operations ─────────────────────────────────────────────────

  describe("getRBACPolicyAddedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getRBACPolicyAddedToast("project-abc"))
      expect(screen.getByText("Security Group Shared")).toBeInTheDocument()
      expect(screen.getByText(/project-abc/)).toBeInTheDocument()
      expect(screen.getByText(/successfully shared with project/)).toBeInTheDocument()
    })
  })

  describe("getRBACPolicyDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getRBACPolicyDeletedToast("project-xyz"))
      expect(screen.getByText("Access Revoked")).toBeInTheDocument()
      expect(screen.getByText(/project-xyz/)).toBeInTheDocument()
      expect(screen.getByText(/successfully revoked/)).toBeInTheDocument()
    })
  })
})
