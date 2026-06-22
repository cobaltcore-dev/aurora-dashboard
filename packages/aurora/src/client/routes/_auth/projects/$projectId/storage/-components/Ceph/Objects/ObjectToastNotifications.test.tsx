import { describe, it, expect, vi } from "vitest"
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
} from "./ObjectToastNotifications"

describe("ObjectToastNotifications", () => {
  const mockConfig = {
    onDismiss: vi.fn(),
  }

  describe("Folder operations", () => {
    it("creates folder created toast", () => {
      const toast = getFolderCreatedToast("documents/reports/", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.onDismiss).toBe(mockConfig.onDismiss)
      expect(toast.children).toBeDefined()
    })

    it("creates folder create error toast", () => {
      const toast = getFolderCreateErrorToast("documents/reports/", "Access denied", mockConfig)

      expect(toast.variant).toBe("error")
      expect(toast.children).toBeDefined()
    })
  })

  describe("Object delete operations", () => {
    it("creates object deleted toast", () => {
      const toast = getObjectDeletedToast("folder/file.txt", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("creates object delete error toast", () => {
      const toast = getObjectDeleteErrorToast("folder/file.txt", "Permission denied", mockConfig)

      expect(toast.variant).toBe("error")
      expect(toast.children).toBeDefined()
    })

    it("extracts display name from object key", () => {
      const toast = getObjectDeletedToast("documents/reports/Q1.pdf", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("handles object key without path", () => {
      const toast = getObjectDeletedToast("simple-file.txt", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })
  })

  describe("Object copy operations", () => {
    it("creates object copied toast", () => {
      const toast = getObjectCopiedToast("file.txt", "target-bucket", "folder/file.txt", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("creates object copied toast with overwrite flag", () => {
      const toast = getObjectCopiedToast("file.txt", "target-bucket", "folder/file.txt", mockConfig, true)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("creates object copy error toast", () => {
      const toast = getObjectCopyErrorToast("file.txt", "Bucket not found", mockConfig)

      expect(toast.variant).toBe("error")
      expect(toast.children).toBeDefined()
    })
  })

  describe("Object move operations", () => {
    it("creates object moved toast", () => {
      const toast = getObjectMovedToast("old/file.txt", "new-bucket", "new/path/file.txt", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("creates object move error toast", () => {
      const toast = getObjectMoveErrorToast("old/file.txt", "Insufficient permissions", mockConfig)

      expect(toast.variant).toBe("error")
      expect(toast.children).toBeDefined()
    })
  })

  describe("Object metadata operations", () => {
    it("creates metadata updated toast", () => {
      const toast = getObjectMetadataUpdatedToast("documents/file.txt", mockConfig)

      expect(toast.variant).toBe("success")
      expect(toast.children).toBeDefined()
    })

    it("creates metadata update error toast", () => {
      const toast = getObjectMetadataUpdateErrorToast("documents/file.txt", "Metadata too large", mockConfig)

      expect(toast.variant).toBe("error")
      expect(toast.children).toBeDefined()
    })
  })

  describe("Toast configuration", () => {
    it("includes onDismiss callback", () => {
      const toast = getFolderCreatedToast("folder/", mockConfig)

      expect(toast.onDismiss).toBe(mockConfig.onDismiss)
    })
  })
})
