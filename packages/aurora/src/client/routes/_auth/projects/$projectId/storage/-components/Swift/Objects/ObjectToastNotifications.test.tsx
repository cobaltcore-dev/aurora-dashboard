import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getFolderCreatedToast,
  getFolderCreateErrorToast,
  getFolderDeletedToast,
  getFolderDeleteErrorToast,
  getObjectDownloadErrorToast,
  getObjectDeletedToast,
  getObjectDeleteErrorToast,
  getObjectCopiedToast,
  getObjectCopyErrorToast,
  getObjectMovedToast,
  getObjectMoveErrorToast,
  getTempUrlCopiedToast,
  getObjectMetadataUpdatedToast,
  getObjectMetadataUpdateErrorToast,
  getObjectUploadedToast,
  getObjectUploadCancelledToast,
  getObjectUploadErrorToast,
  getObjectsBulkDeletedToast,
  getObjectsBulkDeleteErrorToast,
} from "./ObjectToastNotifications"

// Helpers return the Juno NotificationManager shape: { message, description }.
// `description` is typed `(() => ReactNode) | ReactNode`, so resolve the function
// form before rendering. Render message and description in separate wrappers so
// getByText can resolve each independently.
type ObjectNotification = ReturnType<typeof getObjectDeletedToast>

const renderNotification = (notification: ObjectNotification) => {
  const description =
    typeof notification.description === "function" ? notification.description() : notification.description
  return render(
    <I18nProvider i18n={i18n}>
      <div>{notification.message}</div>
      <div>{description}</div>
    </I18nProvider>
  )
}

describe("SwiftObjectToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  // ── Folder operations ──────────────────────────────────────────────────────

  describe("getFolderCreatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getFolderCreatedToast("my-folder"))
      expect(screen.getByText("Folder Created")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("handles folder names with special characters", () => {
      renderNotification(getFolderCreatedToast("my folder (2024)"))
      expect(screen.getByText(/my folder \(2024\)/)).toBeInTheDocument()
    })
  })

  describe("getFolderCreateErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getFolderCreateErrorToast("my-folder", "Conflict"))
      expect(screen.getByText("Failed to Create Folder")).toBeInTheDocument()
      expect(screen.getByText(/Could not create folder/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })
  })

  describe("getFolderDeletedToast", () => {
    it("renders plural message when multiple objects were deleted", () => {
      renderNotification(getFolderDeletedToast("my-folder", 5))
      expect(screen.getByText("Folder Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects were permanently deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly one nested object", () => {
      renderNotification(getFolderDeletedToast("my-folder", 1))
      expect(screen.getByText(/1 object was permanently deleted/)).toBeInTheDocument()
    })

    it("renders folder-only message when deletedCount is 0", () => {
      renderNotification(getFolderDeletedToast("my-folder", 0))
      expect(screen.getByText("Folder Deleted")).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })
  })

  describe("getFolderDeleteErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getFolderDeleteErrorToast("my-folder", "Internal Server Error"))
      expect(screen.getByText("Failed to Delete Folder")).toBeInTheDocument()
      expect(screen.getByText(/Could not delete folder/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })
  })

  // ── Object download ────────────────────────────────────────────────────────

  describe("getObjectDownloadErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectDownloadErrorToast("file.txt", "Connection refused"))
      expect(screen.getByText("Failed to Download")).toBeInTheDocument()
      expect(screen.getByText(/file\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/Could not download/)).toBeInTheDocument()
      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    })

    it("handles object names with special characters", () => {
      renderNotification(getObjectDownloadErrorToast("my file (2024).txt", "err"))
      expect(screen.getByText(/my file \(2024\)\.txt/)).toBeInTheDocument()
    })
  })

  // ── Object delete ──────────────────────────────────────────────────────────

  describe("getObjectDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectDeletedToast("report.pdf"))
      expect(screen.getByText("Object Deleted")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })
  })

  describe("getObjectDeleteErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectDeleteErrorToast("report.pdf", "Forbidden"))
      expect(screen.getByText("Failed to Delete Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Object copy ────────────────────────────────────────────────────────────

  describe("getObjectCopiedToast", () => {
    it("renders the destination with target path", () => {
      renderNotification(getObjectCopiedToast("report.pdf", "backup-container", "folder/report.pdf"))
      expect(screen.getByText("Object Copied")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/backup-container/)).toBeInTheDocument()
    })

    it("renders container-only destination when target path is empty", () => {
      renderNotification(getObjectCopiedToast("report.pdf", "other-container", ""))
      expect(screen.getByText("Object Copied")).toBeInTheDocument()
      expect(screen.getByText(/other-container/)).toBeInTheDocument()
    })
  })

  describe("getObjectCopyErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectCopyErrorToast("report.pdf", "Forbidden"))
      expect(screen.getByText("Failed to Copy Object")).toBeInTheDocument()
      expect(screen.getByText(/Could not copy/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Object move ────────────────────────────────────────────────────────────

  describe("getObjectMovedToast", () => {
    it("renders the destination with target path", () => {
      renderNotification(getObjectMovedToast("report.pdf", "backup-container", "folder/report.pdf"))
      expect(screen.getByText("Object Moved")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/backup-container/)).toBeInTheDocument()
    })

    it("renders container-only destination when target path is empty", () => {
      renderNotification(getObjectMovedToast("report.pdf", "other-container", ""))
      expect(screen.getByText("Object Moved")).toBeInTheDocument()
      expect(screen.getByText(/other-container/)).toBeInTheDocument()
    })
  })

  describe("getObjectMoveErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectMoveErrorToast("report.pdf", "Forbidden"))
      expect(screen.getByText("Failed to Move Object")).toBeInTheDocument()
      expect(screen.getByText(/Could not move/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Temporary URL ──────────────────────────────────────────────────────────

  describe("getTempUrlCopiedToast", () => {
    it("renders object name in description", () => {
      renderNotification(getTempUrlCopiedToast("report.pdf"))
      expect(screen.getByText("URL Copied")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
    })
  })

  // ── Object metadata update ──────────────────────────────────────────────────

  describe("getObjectMetadataUpdatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectMetadataUpdatedToast("sample.txt"))
      expect(screen.getByText("Object Updated")).toBeInTheDocument()
      expect(screen.getByText(/sample\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/successfully updated/)).toBeInTheDocument()
    })
  })

  describe("getObjectMetadataUpdateErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectMetadataUpdateErrorToast("sample.txt", "Forbidden"))
      expect(screen.getByText("Failed to Update Object")).toBeInTheDocument()
      expect(screen.getByText(/sample\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/Could not update/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })
  })

  // ── Object upload ──────────────────────────────────────────────────────────

  describe("getObjectUploadedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectUploadedToast("report.pdf"))
      expect(screen.getByText("Object Uploaded")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/successfully uploaded/)).toBeInTheDocument()
    })
  })

  describe("getObjectUploadCancelledToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectUploadCancelledToast("report.pdf"))
      expect(screen.getByText("Upload Cancelled")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/was cancelled/)).toBeInTheDocument()
    })
  })

  describe("getObjectUploadErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectUploadErrorToast("report.pdf", "Quota exceeded"))
      expect(screen.getByText("Failed to Upload Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not upload/)).toBeInTheDocument()
      expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument()
    })
  })

  // ── Bulk delete ────────────────────────────────────────────────────────────

  describe("getObjectsBulkDeletedToast", () => {
    it("renders plural message when multiple objects were deleted", () => {
      renderNotification(getObjectsBulkDeletedToast(5))
      expect(screen.getByText("Objects Deleted")).toBeInTheDocument()
      expect(screen.getByText(/5 objects were permanently deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly one object", () => {
      renderNotification(getObjectsBulkDeletedToast(1))
      expect(screen.getByText(/1 object was permanently deleted/)).toBeInTheDocument()
    })
  })

  describe("getObjectsBulkDeleteErrorToast", () => {
    it("renders correct error message content", () => {
      renderNotification(getObjectsBulkDeleteErrorToast("403 Forbidden"))
      expect(screen.getByText("Failed to Delete Objects")).toBeInTheDocument()
      expect(screen.getByText(/One or more objects could not be deleted/)).toBeInTheDocument()
      expect(screen.getByText(/403 Forbidden/)).toBeInTheDocument()
    })

    it("preserves multi-line per-path errors in a pre-wrap block", () => {
      const multiLine = "/container/a.txt: 403 Forbidden\n/container/b.png: 404 Not Found"
      renderNotification(getObjectsBulkDeleteErrorToast(multiLine))
      expect(screen.getByText("Failed to Delete Objects")).toBeInTheDocument()
      const pre = screen.getByText(/403 Forbidden/).closest("span.whitespace-pre-wrap")
      expect(pre).toBeInTheDocument()
      expect(pre).toHaveClass("block")
      expect(pre).toHaveTextContent("404 Not Found")
    })
  })

  // ── Notification configuration ─────────────────────────────────────────────

  describe("Notification configuration", () => {
    it("all helpers return a message and description as renderable ReactNodes", () => {
      const notifications = [
        getFolderCreatedToast("f"),
        getFolderCreateErrorToast("f", "err"),
        getFolderDeletedToast("f", 2),
        getFolderDeleteErrorToast("f", "err"),
        getObjectDownloadErrorToast("f", "err"),
        getObjectDeletedToast("f"),
        getObjectDeleteErrorToast("f", "err"),
        getObjectCopiedToast("f", "c", ""),
        getObjectCopyErrorToast("f", "err"),
        getObjectMovedToast("f", "c", ""),
        getObjectMoveErrorToast("f", "err"),
        getTempUrlCopiedToast("f"),
        getObjectMetadataUpdatedToast("f"),
        getObjectMetadataUpdateErrorToast("f", "err"),
        getObjectUploadedToast("f"),
        getObjectUploadCancelledToast("f"),
        getObjectUploadErrorToast("f", "err"),
        getObjectsBulkDeletedToast(3),
        getObjectsBulkDeleteErrorToast("err"),
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
      const toast = getFolderCreatedToast("f")
      expect(toast).not.toHaveProperty("variant")
      expect(toast).not.toHaveProperty("children")
      expect(toast).not.toHaveProperty("onDismiss")
    })
  })
})
