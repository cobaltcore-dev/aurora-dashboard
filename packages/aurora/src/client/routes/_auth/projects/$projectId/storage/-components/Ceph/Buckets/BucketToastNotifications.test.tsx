import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getBucketCreatedToast,
  getBucketCreateErrorToast,
  getBucketEmptiedToast,
  getBucketEmptyErrorToast,
  getBucketDeletedToast,
  getBucketDeleteErrorToast,
  getBucketsEmptyCompleteToast,
} from "./BucketToastNotifications"

// Helpers return the Juno NotificationManager shape: { message, description }.
// `description` is typed `(() => ReactNode) | ReactNode`, so resolve the function
// form before rendering. Both nodes are bare <Trans>, so render each in its own
// wrapper element to keep getByText able to resolve them individually.
type BucketNotification = ReturnType<typeof getBucketCreatedToast>

const renderNotification = (notification: BucketNotification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("BucketToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  // ── getBucketCreatedToast ────────────────────────────────────────────────────

  describe("getBucketCreatedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketCreatedToast("my-bucket")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getBucketCreatedToast("my-bucket"))
      expect(screen.getByText("Bucket Created")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("handles bucket names with special characters", () => {
      renderNotification(getBucketCreatedToast("my-bucket-2024"))
      expect(screen.getByText(/my-bucket-2024/)).toBeInTheDocument()
    })

    it("handles empty bucket name", () => {
      renderNotification(getBucketCreatedToast(""))
      expect(screen.getByText("Bucket Created")).toBeInTheDocument()
    })
  })

  // ── getBucketCreateErrorToast ────────────────────────────────────────────────

  describe("getBucketCreateErrorToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "Conflict")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct error message content", () => {
      renderNotification(getBucketCreateErrorToast("my-bucket", "Conflict"))
      expect(screen.getByText("Failed to Create Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not create bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })

    it("handles different error messages", () => {
      renderNotification(getBucketCreateErrorToast("my-bucket", "Bucket already exists"))
      expect(screen.getByText(/Bucket already exists/)).toBeInTheDocument()
    })

    it("handles long error messages", () => {
      const longMessage = "The server encountered an internal error and was unable to complete your request"
      renderNotification(getBucketCreateErrorToast("my-bucket", longMessage))
      expect(screen.getByText(/The server encountered an internal error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      renderNotification(getBucketCreateErrorToast("my-bucket", ""))
      expect(screen.getByText("Failed to Create Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketEmptiedToast ────────────────────────────────────────────────────

  describe("getBucketEmptiedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketEmptiedToast("my-bucket", 5)
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders plural message when multiple objects were deleted", () => {
      renderNotification(getBucketEmptiedToast("my-bucket", 5))
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly 1 object was deleted", () => {
      renderNotification(getBucketEmptiedToast("my-bucket", 1))
      expect(screen.getByText(/1 object deleted/)).toBeInTheDocument()
    })

    it("renders already empty message when deletedCount is 0", () => {
      renderNotification(getBucketEmptiedToast("my-bucket", 0))
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
      expect(screen.getByText(/was already empty/)).toBeInTheDocument()
    })

    it("handles empty bucket name", () => {
      renderNotification(getBucketEmptiedToast("", 2))
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
    })
  })

  // ── getBucketEmptyErrorToast ────────────────────────────────────────────────

  describe("getBucketEmptyErrorToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "Internal Server Error")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct error message content", () => {
      renderNotification(getBucketEmptyErrorToast("my-bucket", "Internal Server Error"))
      expect(screen.getByText("Failed to Empty Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not empty bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles different error messages", () => {
      renderNotification(getBucketEmptyErrorToast("my-bucket", "Bulk delete failed"))
      expect(screen.getByText(/Bulk delete failed/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      renderNotification(getBucketEmptyErrorToast("my-bucket", ""))
      expect(screen.getByText("Failed to Empty Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketDeletedToast ────────────────────────────────────────────────────

  describe("getBucketDeletedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketDeletedToast("my-bucket")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getBucketDeletedToast("my-bucket"))
      expect(screen.getByText("Bucket Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })

    it("handles bucket names with special characters", () => {
      renderNotification(getBucketDeletedToast("my-bucket-2024"))
      expect(screen.getByText(/my-bucket-2024/)).toBeInTheDocument()
    })
  })

  // ── getBucketDeleteErrorToast ────────────────────────────────────────────────

  describe("getBucketDeleteErrorToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "Forbidden")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct error message content", () => {
      renderNotification(getBucketDeleteErrorToast("my-bucket", "Forbidden"))
      expect(screen.getByText("Failed to Delete Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("handles different error messages", () => {
      renderNotification(getBucketDeleteErrorToast("my-bucket", "Internal Server Error"))
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      renderNotification(getBucketDeleteErrorToast("my-bucket", ""))
      expect(screen.getByText("Failed to Delete Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketsEmptyCompleteToast ─────────────────────────────────────────────

  describe("getBucketsEmptyCompleteToast", () => {
    it("returns notification with correct structure when no errors", () => {
      const toast = getBucketsEmptyCompleteToast(5, 120, [])
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders success message with correct bucket and object counts", () => {
      renderNotification(getBucketsEmptyCompleteToast(5, 120, []))
      expect(screen.getByText("All Buckets Emptied")).toBeInTheDocument()
      expect(screen.getByText(/5 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/120 objects/)).toBeInTheDocument()
    })

    it("renders success message with singular bucket", () => {
      renderNotification(getBucketsEmptyCompleteToast(1, 10, []))
      expect(screen.getByText(/1 bucket/)).toBeInTheDocument()
      expect(screen.getByText(/10 objects/)).toBeInTheDocument()
    })

    it("renders success message with singular object", () => {
      renderNotification(getBucketsEmptyCompleteToast(2, 1, []))
      expect(screen.getByText(/2 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/1 object/)).toBeInTheDocument()
    })

    it("renders error title when there are errors", () => {
      renderNotification(getBucketsEmptyCompleteToast(3, 100, ["bucket1", "bucket2"]))
      expect(screen.getByText("Empty All Completed with Errors")).toBeInTheDocument()
    })

    it("renders warning message with correct counts when errors exist", () => {
      renderNotification(getBucketsEmptyCompleteToast(3, 100, ["bucket1", "bucket2"]))
      expect(screen.getByText("Empty All Completed with Errors")).toBeInTheDocument()
      expect(screen.getByText(/Successfully emptied 3 of 5 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/100 objects/)).toBeInTheDocument()
      expect(screen.getByText(/2 buckets failed/)).toBeInTheDocument()
    })

    it("renders warning with singular failed bucket", () => {
      renderNotification(getBucketsEmptyCompleteToast(2, 50, ["bucket1"]))
      expect(screen.getByText(/1 bucket failed/)).toBeInTheDocument()
    })

    it("handles zero emptied buckets with errors", () => {
      renderNotification(getBucketsEmptyCompleteToast(0, 0, ["bucket1", "bucket2", "bucket3"]))
      expect(screen.getByText(/0 of 3 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/3 buckets failed/)).toBeInTheDocument()
    })
  })

  // ── Notification configuration ───────────────────────────────────────────────

  describe("Notification configuration", () => {
    it("all helpers return a message and description as ReactNodes", () => {
      const notifications = [
        getBucketCreatedToast("b"),
        getBucketCreateErrorToast("b", "err"),
        getBucketEmptiedToast("b", 5),
        getBucketEmptyErrorToast("b", "err"),
        getBucketDeletedToast("b"),
        getBucketDeleteErrorToast("b", "err"),
        getBucketsEmptyCompleteToast(3, 100, []),
      ]
      notifications.forEach((notification) => {
        expect(notification.message).toBeTruthy()
        expect(typeof notification.message).toBe("object")
        expect(notification.description).toBeTruthy()
        expect(typeof notification.description).toBe("object")
      })
    })

    it("does not expose legacy toast props (variant / children)", () => {
      const toast = getBucketCreatedToast("b")
      expect(toast).not.toHaveProperty("variant")
      expect(toast).not.toHaveProperty("children")
    })
  })
})
