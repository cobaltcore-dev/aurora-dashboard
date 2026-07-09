import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getFolderCreatedToast,
  getFolderCreateErrorToast,
  getObjectDeletedToast,
  getObjectDeleteErrorToast,
  getObjectCopiedToast,
  getObjectCopyErrorToast,
  getObjectMovedToast,
  getObjectMoveErrorToast,
  getObjectMetadataUpdatedToast,
  getObjectMetadataUpdateErrorToast,
  getObjectDownloadStartedToast,
  getObjectDownloadCancelledToast,
  getObjectDownloadErrorToast,
  getVersionRestoredToast,
  getVersionRestoreErrorToast,
  getVersionDeletedToast,
  getVersionDeleteErrorToast,
} from "./ObjectToastNotifications"

// Helpers return the Juno NotificationManager shape: { message, description }.
// `description` is typed `(() => ReactNode) | ReactNode`, so resolve the function
// form before rendering. Both nodes are bare <Trans>, so render each in its own
// wrapper element to keep getByText able to resolve them individually.
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

describe("ObjectToastNotifications", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  // ── Folder operations ──────────────────────────────────────────────────────

  describe("getFolderCreatedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getFolderCreatedToast("documents/reports/")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getFolderCreatedToast("documents/reports/"))
      expect(screen.getByText("Folder Created")).toBeInTheDocument()
      expect(screen.getByText(/documents\/reports\//)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })
  })

  describe("getFolderCreateErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getFolderCreateErrorToast("documents/reports/", "Access denied"))
      expect(screen.getByText("Failed to Create Folder")).toBeInTheDocument()
      expect(screen.getByText(/Could not create folder/)).toBeInTheDocument()
      expect(screen.getByText(/Access denied/)).toBeInTheDocument()
    })
  })

  // ── Object delete ──────────────────────────────────────────────────────────

  describe("getObjectDeletedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectDeletedToast("folder/file.txt"))
      expect(screen.getByText("Object Deleted")).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })

    it("extracts the display name from a nested object key", () => {
      renderNotification(getObjectDeletedToast("documents/reports/Q1.pdf"))
      expect(screen.getByText(/Q1\.pdf/)).toBeInTheDocument()
      expect(screen.queryByText(/documents\/reports/)).not.toBeInTheDocument()
    })

    it("handles an object key without a path", () => {
      renderNotification(getObjectDeletedToast("simple-file.txt"))
      expect(screen.getByText(/simple-file\.txt/)).toBeInTheDocument()
    })
  })

  describe("getObjectDeleteErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getObjectDeleteErrorToast("folder/file.txt", "Permission denied"))
      expect(screen.getByText("Failed to Delete Object")).toBeInTheDocument()
      expect(screen.getByText(/Could not delete/)).toBeInTheDocument()
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
    })
  })

  // ── Object copy ────────────────────────────────────────────────────────────

  describe("getObjectCopiedToast", () => {
    it("renders the destination", () => {
      renderNotification(getObjectCopiedToast("file.txt", "target-bucket", "folder/file.txt"))
      expect(screen.getByText("Object Copied")).toBeInTheDocument()
      expect(screen.getByText(/target-bucket\/folder\/file\.txt/)).toBeInTheDocument()
    })

    it("notes when an existing object was replaced", () => {
      renderNotification(getObjectCopiedToast("file.txt", "target-bucket", "folder/file.txt", true))
      expect(screen.getByText(/existing object was replaced/)).toBeInTheDocument()
    })
  })

  describe("getObjectCopyErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getObjectCopyErrorToast("file.txt", "Bucket not found"))
      expect(screen.getByText("Failed to Copy Object")).toBeInTheDocument()
      expect(screen.getByText(/Bucket not found/)).toBeInTheDocument()
    })
  })

  // ── Object move ────────────────────────────────────────────────────────────

  describe("getObjectMovedToast", () => {
    it("renders the destination", () => {
      renderNotification(getObjectMovedToast("old/file.txt", "new-bucket", "new/path/file.txt"))
      expect(screen.getByText("Object Moved")).toBeInTheDocument()
      expect(screen.getByText(/new-bucket\/new\/path\/file\.txt/)).toBeInTheDocument()
    })
  })

  describe("getObjectMoveErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getObjectMoveErrorToast("old/file.txt", "Insufficient permissions"))
      expect(screen.getByText("Failed to Move Object")).toBeInTheDocument()
      expect(screen.getByText(/Insufficient permissions/)).toBeInTheDocument()
    })
  })

  // ── Object metadata update ──────────────────────────────────────────────────

  describe("getObjectMetadataUpdatedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectMetadataUpdatedToast("documents/file.txt"))
      expect(screen.getByText("Object Updated")).toBeInTheDocument()
      expect(screen.getByText(/were successfully updated/)).toBeInTheDocument()
    })
  })

  describe("getObjectMetadataUpdateErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getObjectMetadataUpdateErrorToast("documents/file.txt", "Metadata too large"))
      expect(screen.getByText("Failed to Update Object")).toBeInTheDocument()
      expect(screen.getByText(/Metadata too large/)).toBeInTheDocument()
    })
  })

  // ── Object download ──────────────────────────────────────────────────────────

  describe("getObjectDownloadStartedToast", () => {
    it("renders correct message content", () => {
      renderNotification(getObjectDownloadStartedToast())
      expect(screen.getByText("Downloading...")).toBeInTheDocument()
      expect(screen.getByText(/Downloading larger files may take a while/)).toBeInTheDocument()
      expect(screen.getByText(/the download\(s\) will be interrupted/)).toBeInTheDocument()
      expect(screen.getByText(/We are working to improve the user experience/)).toBeInTheDocument()
    })
  })

  describe("getObjectDownloadCancelledToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getObjectDownloadCancelledToast("documents/file.txt")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getObjectDownloadCancelledToast("documents/file.txt"))
      expect(screen.getByText("Download Cancelled")).toBeInTheDocument()
      expect(screen.getByText('Download of "file.txt" was cancelled.')).toBeInTheDocument()
    })

    it("extracts the display name from a nested object key", () => {
      renderNotification(getObjectDownloadCancelledToast("documents/reports/Q1.pdf"))
      expect(screen.getByText(/Q1\.pdf/)).toBeInTheDocument()
      expect(screen.queryByText(/documents\/reports/)).not.toBeInTheDocument()
    })
  })

  describe("getObjectDownloadErrorToast", () => {
    it("renders correct error content", () => {
      renderNotification(getObjectDownloadErrorToast("documents/file.txt", "Network error"))
      expect(screen.getByText("Failed to Download Object")).toBeInTheDocument()
      expect(screen.getByText(/Could not download/)).toBeInTheDocument()
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })

    it("extracts the display name from a nested object key", () => {
      renderNotification(getObjectDownloadErrorToast("documents/reports/Q1.pdf", "err"))
      expect(screen.getByText(/Q1\.pdf/)).toBeInTheDocument()
    })
  })

  // ── Notification configuration ───────────────────────────────────────────────

  describe("Notification configuration", () => {
    it("all helpers return a message and description as ReactNodes", () => {
      const notifications = [
        getFolderCreatedToast("folder/"),
        getFolderCreateErrorToast("folder/", "err"),
        getObjectDeletedToast("a/b.txt"),
        getObjectDeleteErrorToast("a/b.txt", "err"),
        getObjectCopiedToast("a.txt", "bucket", "a.txt"),
        getObjectCopyErrorToast("a.txt", "err"),
        getObjectMovedToast("a.txt", "bucket", "a.txt"),
        getObjectMoveErrorToast("a.txt", "err"),
        getObjectMetadataUpdatedToast("a.txt"),
        getObjectMetadataUpdateErrorToast("a.txt", "err"),
        getObjectDownloadStartedToast(),
        getObjectDownloadCancelledToast("a.txt"),
        getObjectDownloadErrorToast("a.txt", "err"),
        getVersionRestoredToast("a.txt"),
        getVersionRestoreErrorToast("a.txt", "err"),
        getVersionDeletedToast("a.txt"),
        getVersionDeleteErrorToast("a.txt", "err"),
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
      const toast = getObjectDeletedToast("a/b.txt")
      expect(toast).not.toHaveProperty("variant")
      expect(toast).not.toHaveProperty("children")
      expect(toast).not.toHaveProperty("onDismiss")
    })
  })

  // ── Version restore ────────────────────────────────────────────────────────

  describe("getVersionRestoredToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getVersionRestoredToast("documents/file.txt")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getVersionRestoredToast("documents/file.txt"))
      expect(screen.getByText("Version Restored")).toBeInTheDocument()
      expect(screen.getByText('"file.txt" was successfully restored.')).toBeInTheDocument()
    })

    it("extracts basename from path", () => {
      renderNotification(getVersionRestoredToast("a/b/c/report.pdf"))
      expect(screen.getByText('"report.pdf" was successfully restored.')).toBeInTheDocument()
    })
  })

  describe("getVersionRestoreErrorToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getVersionRestoreErrorToast("file.txt", "Network error")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct error message", () => {
      renderNotification(getVersionRestoreErrorToast("documents/file.txt", "Access denied"))
      expect(screen.getByText("Failed to Restore Version")).toBeInTheDocument()
      expect(screen.getByText('Could not restore "file.txt": Access denied')).toBeInTheDocument()
    })
  })

  // ── Version delete ─────────────────────────────────────────────────────────

  describe("getVersionDeletedToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getVersionDeletedToast("documents/file.txt")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct message content", () => {
      renderNotification(getVersionDeletedToast("documents/file.txt"))
      expect(screen.getByText("Version Deleted")).toBeInTheDocument()
      expect(screen.getByText('Version of "file.txt" was permanently deleted.')).toBeInTheDocument()
    })

    it("extracts basename from path", () => {
      renderNotification(getVersionDeletedToast("a/b/c/report.pdf"))
      expect(screen.getByText('Version of "report.pdf" was permanently deleted.')).toBeInTheDocument()
    })
  })

  describe("getVersionDeleteErrorToast", () => {
    it("returns notification with correct structure", () => {
      const toast = getVersionDeleteErrorToast("file.txt", "Network error")
      expect(toast.message).toBeDefined()
      expect(toast.description).toBeDefined()
    })

    it("renders correct error message", () => {
      renderNotification(getVersionDeleteErrorToast("documents/file.txt", "Permission denied"))
      expect(screen.getByText("Failed to Delete Version")).toBeInTheDocument()
      expect(screen.getByText('Could not delete version of "file.txt": Permission denied')).toBeInTheDocument()
    })
  })
})
