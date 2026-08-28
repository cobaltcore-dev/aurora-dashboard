import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getSecurityGroupDeletedToast,
  getSecurityGroupDeleteErrorToast,
  getSecurityGroupUpdatedToast,
  getSecurityGroupUpdateErrorToast,
  getSecurityGroupRuleCreatedToast,
  getSecurityGroupRuleCreateErrorToast,
  getSecurityGroupRuleDeletedToast,
  getSecurityGroupRuleDeleteErrorToast,
  getRBACPolicyAddedToast,
  getRBACPolicyAddErrorToast,
  getRBACPolicyDeletedToast,
  getRBACPolicyDeleteErrorToast,
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
        getSecurityGroupDeleteErrorToast("error"),
        getSecurityGroupUpdatedToast("my-sg"),
        getSecurityGroupUpdateErrorToast("error"),
        getSecurityGroupRuleCreatedToast(),
        getSecurityGroupRuleCreateErrorToast("error"),
        getSecurityGroupRuleDeletedToast(),
        getSecurityGroupRuleDeleteErrorToast("error"),
        getRBACPolicyAddedToast("project-abc"),
        getRBACPolicyAddErrorToast("error"),
        getRBACPolicyDeletedToast("project-abc"),
        getRBACPolicyDeleteErrorToast("error"),
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

      renderNotification(getSecurityGroupUpdateErrorToast("Quota exceeded"))
      expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument()
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

  describe("getSecurityGroupDeleteErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getSecurityGroupDeleteErrorToast("Forbidden"))
      expect(screen.getByText("Failed to Delete Security Group")).toBeInTheDocument()
      expect(screen.getByText(/Could not delete security group: Forbidden/)).toBeInTheDocument()
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

  describe("getSecurityGroupUpdateErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getSecurityGroupUpdateErrorToast("Internal Server Error"))
      expect(screen.getByText("Failed to Update Security Group")).toBeInTheDocument()
      expect(screen.getByText(/Could not update security group: Internal Server Error/)).toBeInTheDocument()
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

  describe("getSecurityGroupRuleCreateErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getSecurityGroupRuleCreateErrorToast("Conflict"))
      expect(screen.getByText("Failed to Create Rule")).toBeInTheDocument()
      expect(screen.getByText(/Could not create security group rule: Conflict/)).toBeInTheDocument()
    })
  })

  describe("getSecurityGroupRuleDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getSecurityGroupRuleDeletedToast())
      expect(screen.getByText("Rule Deleted")).toBeInTheDocument()
      expect(screen.getByText(/Security group rule was successfully deleted/)).toBeInTheDocument()
    })
  })

  describe("getSecurityGroupRuleDeleteErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getSecurityGroupRuleDeleteErrorToast("Not found"))
      expect(screen.getByText("Failed to Delete Rule")).toBeInTheDocument()
      expect(screen.getByText(/Could not delete security group rule: Not found/)).toBeInTheDocument()
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

  describe("getRBACPolicyAddErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getRBACPolicyAddErrorToast("Already shared"))
      expect(screen.getByText("Failed to Share Security Group")).toBeInTheDocument()
      expect(screen.getByText(/Could not share security group: Already shared/)).toBeInTheDocument()
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

  describe("getRBACPolicyDeleteErrorToast", () => {
    it("renders correct error message", () => {
      renderNotification(getRBACPolicyDeleteErrorToast("Permission denied"))
      expect(screen.getByText("Failed to Revoke Access")).toBeInTheDocument()
      expect(screen.getByText(/Could not revoke access: Permission denied/)).toBeInTheDocument()
    })
  })
})
