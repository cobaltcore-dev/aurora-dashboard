import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { ReactNode } from "react"
import {
  getImageUpdatedToast,
  getImageUpdateErrorToast,
  getImageCreatedToast,
  getImageCreateErrorToast,
  getImageFileUploadErrorToast,
  getImageDeletedToast,
  getImageDeleteErrorToast,
  getImageActivatedToast,
  getImageDeactivatedToast,
  getImageActivationErrorToast,
  getImageDeactivationErrorToast,
  getBulkDeleteSuccessToast,
  getBulkDeleteErrorToast,
  getBulkDeletePartialToast,
  getBulkActivateSuccessToast,
  getBulkActivateErrorToast,
  getBulkActivatePartialToast,
  getBulkDeactivateSuccessToast,
  getBulkDeactivateErrorToast,
  getBulkDeactivatePartialToast,
  getImageAccessStatusUpdatedToast,
  getImageAccessStatusErrorToast,
  getImageVisibilityUpdatedToast,
  getImageVisibilityUpdateErrorToast,
} from "./ImageToastNotifications"

type Notification = { message: ReactNode } & NotificationOptions

// The builders now return `{ message, description }` for the NotificationManager
// `toast` API instead of a `ToastProps` object. Render both parts in separate
// wrappers so `getByText` resolves the title and body independently, the way the
// old NotificationText structure did.
const renderNotification = (notification: Notification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <>
        <div>{notification.message}</div>
        <div>{description}</div>
      </>
    </I18nProvider>
  )
}

describe("ImageToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  describe("getImageUpdatedToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageUpdatedToast("test-image")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct message content", () => {
      renderNotification(getImageUpdatedToast("test-image"))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/test-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been updated/)).toBeInTheDocument()
    })
  })

  describe("getImageUpdateErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageUpdateErrorToast("failed-image", "Invalid metadata format")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageUpdateErrorToast("failed-image", "Invalid metadata format"))

      expect(screen.getByText("Unable to Update Image")).toBeInTheDocument()
      expect(screen.getByText(/failed-image/)).toBeInTheDocument()
      expect(screen.getByText(/could not be updated/)).toBeInTheDocument()
      expect(screen.getByText(/Invalid metadata format/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      renderNotification(getImageUpdateErrorToast("test-image", "Network timeout occurred"))

      expect(screen.getByText(/Network timeout occurred/)).toBeInTheDocument()
    })

    it("should handle long error messages", () => {
      const longMessage =
        "Failed to update image: The request media type application/json is not supported by this server"
      renderNotification(getImageUpdateErrorToast("test-image", longMessage))

      expect(screen.getByText(/Failed to update image/)).toBeInTheDocument()
      expect(screen.getByText(/application\/json is not supported/)).toBeInTheDocument()
    })
  })

  describe("getImageCreatedToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageCreatedToast("new-image")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct message content", () => {
      renderNotification(getImageCreatedToast("new-image"))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/new-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been created/)).toBeInTheDocument()
    })
  })

  describe("getImageCreateErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageCreateErrorToast("failed-image", "Invalid file format")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageCreateErrorToast("failed-image", "Invalid file format"))

      expect(screen.getByText("Unable to Create Image")).toBeInTheDocument()
      expect(screen.getByText(/failed-image/)).toBeInTheDocument()
      expect(screen.getByText(/could not be created/)).toBeInTheDocument()
      expect(screen.getByText(/Invalid file format/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      renderNotification(getImageCreateErrorToast("test-image", "Storage quota exceeded"))

      expect(screen.getByText(/Storage quota exceeded/)).toBeInTheDocument()
    })

    it("should handle long error messages", () => {
      const longMessage = "Failed to create image: The file exceeds the maximum allowed size of 10GB"
      renderNotification(getImageCreateErrorToast("test-image", longMessage))

      expect(screen.getByText(/Failed to create image/)).toBeInTheDocument()
      expect(screen.getByText(/exceeds the maximum allowed size/)).toBeInTheDocument()
    })
  })

  describe("getImageFileUploadErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageFileUploadErrorToast("large-image.qcow2", "Network timeout")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageFileUploadErrorToast("image.qcow2", "Connection lost"))

      expect(screen.getByText("Unable to Upload Image File")).toBeInTheDocument()
      expect(screen.getByText(/image\.qcow2/)).toBeInTheDocument()
      expect(screen.getByText(/Failed to upload file/)).toBeInTheDocument()
      expect(screen.getByText(/Connection lost/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      renderNotification(getImageFileUploadErrorToast("test-image.img", "Insufficient disk space"))

      expect(screen.getByText(/Insufficient disk space/)).toBeInTheDocument()
    })

    it("should handle file names with special characters", () => {
      renderNotification(getImageFileUploadErrorToast("my-image_v2.1.qcow2", "Upload failed"))

      expect(screen.getByText(/my-image_v2\.1\.qcow2/)).toBeInTheDocument()
    })

    it("should handle long error messages", () => {
      const longMessage =
        "Failed to upload file: Request entity too large. The file size exceeds the maximum allowed limit of 50GB per upload"
      renderNotification(getImageFileUploadErrorToast("large-image.qcow2", longMessage))

      expect(screen.getByText(/Failed to upload file/)).toBeInTheDocument()
      expect(screen.getByText(/exceeds the maximum allowed limit/)).toBeInTheDocument()
    })

    it("should handle empty error message", () => {
      renderNotification(getImageFileUploadErrorToast("image.qcow2", ""))

      expect(screen.getByText(/image\.qcow2/)).toBeInTheDocument()
      // Should still render title even with empty message
      expect(screen.getByText("Unable to Upload Image File")).toBeInTheDocument()
    })
  })

  describe("getImageDeletedToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageDeletedToast("deleted-image")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct message content", () => {
      renderNotification(getImageDeletedToast("deleted-image"))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/deleted-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been deleted/)).toBeInTheDocument()
    })
  })

  describe("getImageDeleteErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageDeleteErrorToast("error-image-id", "Permission denied")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageDeleteErrorToast("error-image-id", "Permission denied"))

      expect(screen.getByText("Unable to Delete Image")).toBeInTheDocument()
      expect(screen.getByText(/error-image-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be deleted/)).toBeInTheDocument()
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      renderNotification(getImageDeleteErrorToast("test-id", "Network error occurred"))

      expect(screen.getByText(/Network error occurred/)).toBeInTheDocument()
    })
  })

  describe("getImageActivatedToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageActivatedToast("activated-image")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct message content", () => {
      renderNotification(getImageActivatedToast("activated-image"))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/activated-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been activated/)).toBeInTheDocument()
    })
  })

  describe("getImageDeactivatedToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageDeactivatedToast("deactivated-image")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct message content", () => {
      renderNotification(getImageDeactivatedToast("deactivated-image"))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/deactivated-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been deactivated/)).toBeInTheDocument()
    })
  })

  describe("getImageActivationErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageActivationErrorToast("activation-error-id", "Service unavailable")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageActivationErrorToast("activation-error-id", "Service unavailable"))

      expect(screen.getByText("Unable to Re-activate Image")).toBeInTheDocument()
      expect(screen.getByText(/activation-error-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be re-activated/)).toBeInTheDocument()
      expect(screen.getByText(/Service unavailable/)).toBeInTheDocument()
    })
  })

  describe("getImageDeactivationErrorToast", () => {
    it("should return a notification with message and description", () => {
      const toast = getImageDeactivationErrorToast("deactivation-error-id", "Image is in use")

      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("should render correct error message content", () => {
      renderNotification(getImageDeactivationErrorToast("deactivation-error-id", "Image is in use"))

      expect(screen.getByText("Unable to Deactivate Image")).toBeInTheDocument()
      expect(screen.getByText(/deactivation-error-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be deactivated/)).toBeInTheDocument()
      expect(screen.getByText(/Image is in use/)).toBeInTheDocument()
    })
  })

  describe("Notification structure", () => {
    it("all success notifications expose a message and a description", () => {
      const notifications = [
        getImageUpdatedToast("test"),
        getImageCreatedToast("test"),
        getImageDeletedToast("test"),
        getImageActivatedToast("test"),
        getImageDeactivatedToast("test"),
      ]

      notifications.forEach((toast) => {
        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })
    })

    it("all error notifications expose a message and a description", () => {
      const notifications = [
        getImageDeleteErrorToast("test", "error"),
        getImageActivationErrorToast("test", "error"),
        getImageDeactivationErrorToast("test", "error"),
      ]

      notifications.forEach((toast) => {
        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty string image names", () => {
      renderNotification(getImageUpdatedToast(""))

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
    })

    it("should handle special characters in image names", () => {
      const specialName = "test-image_v1.2.3@latest"
      renderNotification(getImageCreatedToast(specialName))

      expect(screen.getByText(/test-image_v1.2.3@latest/)).toBeInTheDocument()
    })

    it("should handle long image names", () => {
      const longName = "a".repeat(100)
      renderNotification(getImageDeletedToast(longName))

      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument()
    })

    it("should handle empty error messages", () => {
      renderNotification(getImageDeleteErrorToast("test-id", ""))

      expect(screen.getByText("Unable to Delete Image")).toBeInTheDocument()
    })

    it("should handle long error messages", () => {
      const longMessage = "Error: " + "x".repeat(200)
      renderNotification(getImageActivationErrorToast("test-id", longMessage))

      expect(screen.getByText(new RegExp(longMessage))).toBeInTheDocument()
    })
  })

  describe("Return shape", () => {
    it("should return an object with message and description", () => {
      const toast = getImageUpdatedToast("test")

      expect(toast).toHaveProperty("message")
      expect(toast).toHaveProperty("description")
    })

    it("should return renderable nodes for message and description", () => {
      const toast = getImageCreatedToast("test")

      expect(toast.message).toBeTruthy()
      expect(toast.description).toBeTruthy()
    })
  })

  describe("Bulk Delete Operations", () => {
    describe("getBulkDeleteSuccessToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeleteSuccessToast(3, 3)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct message for full success", () => {
        renderNotification(getBulkDeleteSuccessToast(5, 5))

        expect(screen.getByText("Images Deleted")).toBeInTheDocument()
        expect(screen.getByText(/Successfully deleted 5 of 5 image\(s\)/)).toBeInTheDocument()
      })

      it("should handle single image deletion", () => {
        renderNotification(getBulkDeleteSuccessToast(1, 1))

        expect(screen.getByText(/Successfully deleted 1 of 1 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeleteErrorToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeleteErrorToast(2, 2)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct error message", () => {
        renderNotification(getBulkDeleteErrorToast(3, 3))

        expect(screen.getByText("Failed to Delete Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to delete 3 of 3 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may be protected or in use/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeletePartialToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeletePartialToast(2, 1)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct partial success message", () => {
        renderNotification(getBulkDeletePartialToast(7, 3))

        expect(screen.getByText("Partial Delete Success")).toBeInTheDocument()
        expect(screen.getByText(/Deleted 7 image\(s\), but 3 image\(s\) could not be deleted/)).toBeInTheDocument()
      })

      it("should handle edge case of 1 success 1 failure", () => {
        renderNotification(getBulkDeletePartialToast(1, 1))

        expect(screen.getByText(/Deleted 1 image\(s\), but 1 image\(s\) could not be deleted/)).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Activate Operations", () => {
    describe("getBulkActivateSuccessToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkActivateSuccessToast(4, 4)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct success message", () => {
        renderNotification(getBulkActivateSuccessToast(3, 3))

        expect(screen.getByText("Images Activated")).toBeInTheDocument()
        expect(screen.getByText(/Successfully activated 3 of 3 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkActivateErrorToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkActivateErrorToast(2, 2)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct error message", () => {
        renderNotification(getBulkActivateErrorToast(4, 4))

        expect(screen.getByText("Failed to Activate Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to activate 4 of 4 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may already be active or in an invalid state/)).toBeInTheDocument()
      })
    })

    describe("getBulkActivatePartialToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkActivatePartialToast(5, 2)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct partial success message", () => {
        renderNotification(getBulkActivatePartialToast(6, 2))

        expect(screen.getByText("Partial Activation Success")).toBeInTheDocument()
        expect(screen.getByText(/Activated 6 image\(s\), but 2 image\(s\) could not be activated/)).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Deactivate Operations", () => {
    describe("getBulkDeactivateSuccessToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeactivateSuccessToast(3, 3)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct success message", () => {
        renderNotification(getBulkDeactivateSuccessToast(8, 8))

        expect(screen.getByText("Images Deactivated")).toBeInTheDocument()
        expect(screen.getByText(/Successfully deactivated 8 of 8 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeactivateErrorToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeactivateErrorToast(3, 3)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct error message", () => {
        renderNotification(getBulkDeactivateErrorToast(5, 5))

        expect(screen.getByText("Failed to Deactivate Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to deactivate 5 of 5 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may already be deactivated or in an invalid state/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeactivatePartialToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getBulkDeactivatePartialToast(4, 1)

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct partial success message", () => {
        renderNotification(getBulkDeactivatePartialToast(9, 1))

        expect(screen.getByText("Partial Deactivation Success")).toBeInTheDocument()
        expect(
          screen.getByText(/Deactivated 9 image\(s\), but 1 image\(s\) could not be deactivated/)
        ).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Operations - Edge Cases", () => {
    it("should handle zero counts gracefully", () => {
      renderNotification(getBulkDeleteSuccessToast(0, 0))

      expect(screen.getByText(/Successfully deleted 0 of 0 image\(s\)/)).toBeInTheDocument()
    })

    it("should handle large numbers", () => {
      renderNotification(getBulkActivateSuccessToast(9999, 10000))

      expect(screen.getByText(/Successfully activated 9999 of 10000 image\(s\)/)).toBeInTheDocument()
    })

    it("should handle mismatched success and failure counts", () => {
      renderNotification(getBulkDeletePartialToast(100, 1))

      expect(screen.getByText(/Deleted 100 image\(s\), but 1 image\(s\) could not be deleted/)).toBeInTheDocument()
    })
  })

  describe("Image Access Status Toasts", () => {
    describe("getImageAccessStatusUpdatedToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getImageAccessStatusUpdatedToast("accepted")

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct message content", () => {
        renderNotification(getImageAccessStatusUpdatedToast("accepted"))

        expect(screen.getByText("Access Status")).toBeInTheDocument()
        expect(screen.getByText(/Access status updated to "accepted"/)).toBeInTheDocument()
      })

      it("should handle different status values", () => {
        const statuses = ["accepted", "rejected", "pending"]

        statuses.forEach((status) => {
          const { unmount } = renderNotification(getImageAccessStatusUpdatedToast(status))

          expect(screen.getByText(new RegExp(status))).toBeInTheDocument()
          unmount()
        })
      })
    })

    describe("getImageAccessStatusErrorToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getImageAccessStatusErrorToast("Network error occurred")

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct error message content", () => {
        const errorMessage = "Failed to update access status"
        renderNotification(getImageAccessStatusErrorToast(errorMessage))

        expect(screen.getByText("Access Status")).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      it("should handle different error messages", () => {
        const errorMessages = ["Permission denied", "Image not found", "Network timeout occurred"]

        errorMessages.forEach((errorMessage) => {
          const { unmount } = renderNotification(getImageAccessStatusErrorToast(errorMessage))

          expect(screen.getByText(errorMessage)).toBeInTheDocument()
          unmount()
        })
      })

      it("should handle long error messages", () => {
        const longErrorMessage =
          "Failed to update access status: The server returned an unexpected response. Please try again later."
        renderNotification(getImageAccessStatusErrorToast(longErrorMessage))

        expect(screen.getByText(longErrorMessage)).toBeInTheDocument()
      })
    })
  })

  describe("Image Visibility Toasts", () => {
    describe("getImageVisibilityUpdatedToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getImageVisibilityUpdatedToast("test-image", "public")

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct message content", () => {
        renderNotification(getImageVisibilityUpdatedToast("test-image", "public"))

        expect(screen.getByText("Image Visibility")).toBeInTheDocument()
        expect(screen.getByText(/test-image/)).toBeInTheDocument()
        expect(screen.getByText(/public/)).toBeInTheDocument()
      })

      it("should handle different visibility values", () => {
        const visibilities = ["public", "private", "shared"]
        const imageName = "test-image"

        visibilities.forEach((visibility) => {
          const { unmount } = renderNotification(getImageVisibilityUpdatedToast(imageName, visibility))

          expect(screen.getByText(new RegExp(visibility))).toBeInTheDocument()
          unmount()
        })
      })
    })

    describe("getImageVisibilityUpdateErrorToast", () => {
      it("should return a notification with message and description", () => {
        const toast = getImageVisibilityUpdateErrorToast("test-image", "Permission denied")

        expect(toast.message).toBeDefined()
        expect(toast.description).toBeDefined()
      })

      it("should render correct error message content", () => {
        renderNotification(getImageVisibilityUpdateErrorToast("test-image", "Permission denied"))

        expect(screen.getByText("Unable to Update Image Visibility")).toBeInTheDocument()
        expect(screen.getByText(/test-image/)).toBeInTheDocument()
        expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
      })

      it("should handle different error messages", () => {
        const imageName = "test-image"
        const errorMessages = ["Permission denied", "Image not found", "Server error"]

        errorMessages.forEach((errorMessage) => {
          const { unmount } = renderNotification(getImageVisibilityUpdateErrorToast(imageName, errorMessage))

          expect(
            screen.getByText(`Failed to update visibility for "${imageName}": ${errorMessage}`)
          ).toBeInTheDocument()
          unmount()
        })
      })

      it("should handle long error messages", () => {
        const imageName = "test-image"
        const longErrorMessage = `Failed to update visibility for "${imageName}": The server returned an unexpected response. Please try again later.`
        renderNotification(
          getImageVisibilityUpdateErrorToast(
            imageName,
            "The server returned an unexpected response. Please try again later."
          )
        )

        expect(screen.getByText(longErrorMessage)).toBeInTheDocument()
      })
    })
  })
})
