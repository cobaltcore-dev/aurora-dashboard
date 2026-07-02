import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getContainerCreatedToast,
  getContainerCreateErrorToast,
  getContainerEmptiedToast,
  getContainerEmptyErrorToast,
  getContainerDeletedToast,
  getContainerDeleteErrorToast,
  getContainerUpdatedToast,
  getContainerUpdateErrorToast,
  getContainerAclUpdatedToast,
  getContainerAclUpdateErrorToast,
  getContainersEmptiedToast,
  getContainersEmptyErrorToast,
  getContainersEmptyCompleteToast,
} from "./ContainerToastNotifications"

// Helpers return the Juno NotificationManager shape: { message, description }.
// `description` is typed `(() => ReactNode) | ReactNode`, so resolve the function
// form before rendering. Render message and description in separate wrappers so
// getByText can resolve each independently.
type ContainerNotification = ReturnType<typeof getContainerCreatedToast>

const renderNotification = (notification: ContainerNotification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("ContainerToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  // ── Container create ───────────────────────────────────────────────────────

  describe("getContainerCreatedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getContainerCreatedToast("my-container")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getContainerCreatedToast("my-container"))
      expect(screen.getByText("Container Created")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("handles container names with special characters", () => {
      renderNotification(getContainerCreatedToast("my-container/with.special_chars"))
      expect(screen.getByText(/my-container\/with\.special_chars/)).toBeInTheDocument()
    })
  })

  describe("getContainerCreateErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainerCreateErrorToast("my-container", "Conflict"))
      expect(screen.getByText("Failed to Create Container")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/Could not create container/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })

    it("handles long error messages", () => {
      const longMessage = "Container name already exists in this account and cannot be created again"
      renderNotification(getContainerCreateErrorToast("my-container", longMessage))
      expect(screen.getByText(/Container name already exists/)).toBeInTheDocument()
    })
  })

  // ── Container empty ────────────────────────────────────────────────────────

  describe("getContainerEmptiedToast", () => {
    it("renders correct message when objects were deleted", () => {
      renderNotification(getContainerEmptiedToast("my-container", 5))
      expect(screen.getByText("Container Emptied")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully emptied/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects deleted/)).toBeInTheDocument()
    })

    it("uses singular 'object' when deletedCount is 1", () => {
      renderNotification(getContainerEmptiedToast("my-container", 1))
      expect(screen.getByText(/1 object deleted/)).toBeInTheDocument()
    })

    it("renders already empty message when deletedCount is 0", () => {
      renderNotification(getContainerEmptiedToast("my-container", 0))
      expect(screen.getByText("Container Emptied")).toBeInTheDocument()
      expect(screen.getByText(/was already empty/)).toBeInTheDocument()
    })
  })

  describe("getContainerEmptyErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainerEmptyErrorToast("my-container", "Internal Server Error"))
      expect(screen.getByText("Failed to Empty Container")).toBeInTheDocument()
      expect(screen.getByText(/Could not empty container/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })
  })

  // ── Container delete ───────────────────────────────────────────────────────

  describe("getContainerDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getContainerDeletedToast("my-container"))
      expect(screen.getByText("Container Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })

    it("handles container names with special characters", () => {
      renderNotification(getContainerDeletedToast("my-container/with.special_chars"))
      expect(screen.getByText(/my-container\/with\.special_chars/)).toBeInTheDocument()
    })
  })

  describe("getContainerDeleteErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainerDeleteErrorToast("my-container", "Not Found"))
      expect(screen.getByText("Failed to Delete Container")).toBeInTheDocument()
      expect(screen.getByText(/Could not delete container/)).toBeInTheDocument()
      expect(screen.getByText(/Not Found/)).toBeInTheDocument()
    })
  })

  // ── Container properties ───────────────────────────────────────────────────

  describe("getContainerUpdatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getContainerUpdatedToast("my-container"))
      expect(screen.getByText("Container Updated")).toBeInTheDocument()
      expect(screen.getByText(/properties were successfully updated/)).toBeInTheDocument()
    })
  })

  describe("getContainerUpdateErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainerUpdateErrorToast("my-container", "Bad Request"))
      expect(screen.getByText("Failed to Update Container")).toBeInTheDocument()
      expect(screen.getByText(/Could not update container/)).toBeInTheDocument()
      expect(screen.getByText(/Bad Request/)).toBeInTheDocument()
    })
  })

  // ── Container ACL ──────────────────────────────────────────────────────────

  describe("getContainerAclUpdatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getContainerAclUpdatedToast("my-container"))
      expect(screen.getByText("Access Control Updated")).toBeInTheDocument()
      expect(screen.getByText(/ACLs for container/)).toBeInTheDocument()
      expect(screen.getByText(/were successfully updated/)).toBeInTheDocument()
    })
  })

  describe("getContainerAclUpdateErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainerAclUpdateErrorToast("my-container", "Forbidden"))
      expect(screen.getByText("Failed to Update Access Control")).toBeInTheDocument()
      expect(screen.getByText(/Could not update ACLs for container/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Empty-all (bulk) ───────────────────────────────────────────────────────

  describe("getContainersEmptiedToast", () => {
    it("renders counts when objects were deleted", () => {
      renderNotification(getContainersEmptiedToast(3, 15))
      expect(screen.getByText("Containers Emptied")).toBeInTheDocument()
      expect(screen.getByText(/3 container/)).toBeInTheDocument()
      expect(screen.getByText(/15 object/)).toBeInTheDocument()
    })

    it("renders already empty message when totalDeleted is 0", () => {
      renderNotification(getContainersEmptiedToast(2, 0))
      expect(screen.getByText("Containers Emptied")).toBeInTheDocument()
      expect(screen.getByText(/already empty/)).toBeInTheDocument()
    })
  })

  describe("getContainersEmptyErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getContainersEmptyErrorToast("bucket-1: 500 Internal Server Error"))
      expect(screen.getByText("Failed to Empty Containers")).toBeInTheDocument()
      expect(screen.getByText(/One or more containers could not be emptied/)).toBeInTheDocument()
      expect(screen.getByText(/bucket-1/)).toBeInTheDocument()
    })
  })

  describe("getContainersEmptyCompleteToast", () => {
    it("renders success title and counts when no errors", () => {
      renderNotification(getContainersEmptyCompleteToast(3, 12, []))
      expect(screen.getByText("Containers Emptied")).toBeInTheDocument()
      expect(screen.getByText(/3 containers/)).toBeInTheDocument()
      expect(screen.getByText(/12 objects/)).toBeInTheDocument()
    })

    it("renders partial title and both success and error info", () => {
      renderNotification(getContainersEmptyCompleteToast(2, 8, ["bucket-c: 500 error"]))
      expect(screen.getByText("Containers Partially Emptied")).toBeInTheDocument()
      expect(screen.getByText(/2 containers/)).toBeInTheDocument()
      expect(screen.getByText(/bucket-c/)).toBeInTheDocument()
    })

    it("renders error title and error details when emptiedCount is 0", () => {
      renderNotification(getContainersEmptyCompleteToast(0, 0, ["a: err", "b: err"]))
      expect(screen.getByText("Failed to Empty Containers")).toBeInTheDocument()
      expect(screen.getByText(/a: err/)).toBeInTheDocument()
    })
  })

  // ── Notification configuration ─────────────────────────────────────────────

  describe("Notification configuration", () => {
    it("all helpers return a message and description as renderable ReactNodes", () => {
      const notifications = [
        getContainerCreatedToast("c"),
        getContainerCreateErrorToast("c", "err"),
        getContainerEmptiedToast("c", 3),
        getContainerEmptyErrorToast("c", "err"),
        getContainerDeletedToast("c"),
        getContainerDeleteErrorToast("c", "err"),
        getContainerUpdatedToast("c"),
        getContainerUpdateErrorToast("c", "err"),
        getContainerAclUpdatedToast("c"),
        getContainerAclUpdateErrorToast("c", "err"),
        getContainersEmptiedToast(2, 5),
        getContainersEmptyErrorToast("err"),
        getContainersEmptyCompleteToast(2, 5, []),
      ]
      notifications.forEach((notification) => {
        expect(notification.message).toBeTruthy()
        expect(notification.description).toBeTruthy()
        // Prove each payload is actually renderable rather than asserting a
        // specific typeof — ReactNode also covers strings, numbers, and the
        // () => ReactNode form of description.
        const view = renderNotification(notification)
        view.unmount()
      })
    })

    it("does not expose legacy toast props (variant / children / onDismiss)", () => {
      const toast = getContainerCreatedToast("c")
      expect(toast).not.toHaveProperty("variant")
      expect(toast).not.toHaveProperty("children")
      expect(toast).not.toHaveProperty("onDismiss")
    })
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("handles empty container names", () => {
      renderNotification(getContainerCreatedToast(""))
      expect(screen.getByText("Container Created")).toBeInTheDocument()
    })

    it("handles long container names", () => {
      const longName = "a".repeat(256)
      renderNotification(getContainerDeletedToast(longName))
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument()
    })

    it("handles empty error messages", () => {
      renderNotification(getContainerDeleteErrorToast("my-container", ""))
      expect(screen.getByText("Failed to Delete Container")).toBeInTheDocument()
    })
  })
})
