import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
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
  getObjectUploadErrorToast,
  getObjectsBulkDeletedToast,
  getObjectsBulkDeleteErrorToast,
} from "./ObjectToastNotifications"

describe("ObjectToastNotifications", () => {
  const mockOnDismiss = vi.fn()
  const defaultConfig = { onDismiss: mockOnDismiss }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  // ── getFolderCreatedToast ────────────────────────────────────────────────────

  describe("getFolderCreatedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getFolderCreatedToast("my-folder", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getFolderCreatedToast("my-folder", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Folder Created")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getFolderCreatedToast("my-folder", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles folder names with special characters", () => {
      const toast = getFolderCreatedToast("my folder (2024)", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my folder \(2024\)/)).toBeInTheDocument()
    })

    it("handles empty folder name", () => {
      const toast = getFolderCreatedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Folder Created")).toBeInTheDocument()
    })
  })

  // ── getFolderCreateErrorToast ────────────────────────────────────────────────

  describe("getFolderCreateErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getFolderCreateErrorToast("my-folder", "Conflict", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getFolderCreateErrorToast("my-folder", "Conflict", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Create Folder")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/Could not create folder/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getFolderCreateErrorToast("my-folder", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getFolderCreateErrorToast("my-folder", "Object already exists", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Object already exists/)).toBeInTheDocument()
    })

    it("handles long error messages", () => {
      const longMessage = "The server encountered an internal error and was unable to complete your request"
      const toast = getFolderCreateErrorToast("my-folder", longMessage, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/The server encountered an internal error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getFolderCreateErrorToast("my-folder", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Create Folder")).toBeInTheDocument()
    })
  })

  // ── getFolderDeletedToast ────────────────────────────────────────────────────

  describe("getFolderDeletedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getFolderDeletedToast("my-folder", 5, defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders plural message when multiple objects were deleted", () => {
      const toast = getFolderDeletedToast("my-folder", 5, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Folder Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects were permanently deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly 1 object was deleted", () => {
      const toast = getFolderDeletedToast("my-folder", 1, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/1 object was permanently deleted/)).toBeInTheDocument()
    })

    it("renders deleted message when deletedCount is 0", () => {
      const toast = getFolderDeletedToast("my-folder", 0, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Folder Deleted")).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getFolderDeletedToast("my-folder", 3, { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty folder name", () => {
      const toast = getFolderDeletedToast("", 2, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Folder Deleted")).toBeInTheDocument()
    })
  })

  // ── getFolderDeleteErrorToast ────────────────────────────────────────────────

  describe("getFolderDeleteErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getFolderDeleteErrorToast("my-folder", "Internal Server Error", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getFolderDeleteErrorToast("my-folder", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Folder")).toBeInTheDocument()
      expect(screen.getByText(/my-folder/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete folder/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getFolderDeleteErrorToast("my-folder", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getFolderDeleteErrorToast("my-folder", "Bulk delete failed", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Bulk delete failed/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getFolderDeleteErrorToast("my-folder", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Folder")).toBeInTheDocument()
    })
  })

  // ── getObjectDownloadErrorToast ──────────────────────────────────────────────

  describe("getObjectDownloadErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectDownloadErrorToast("file.txt", "Connection refused", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectDownloadErrorToast("file.txt", "Connection refused", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Download")).toBeInTheDocument()
      expect(screen.getByText(/file\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/Could not download/)).toBeInTheDocument()
      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectDownloadErrorToast("file.txt", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 8000,
      })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("handles different error messages", () => {
      const toast = getObjectDownloadErrorToast("report.pdf", "Object not found", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Object not found/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectDownloadErrorToast("file.txt", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Download")).toBeInTheDocument()
    })

    it("handles object names with special characters", () => {
      const toast = getObjectDownloadErrorToast("my file (2024).txt", "err", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my file \(2024\)\.txt/)).toBeInTheDocument()
    })
  })

  // ── getObjectDeletedToast ────────────────────────────────────────────────────

  describe("getObjectDeletedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectDeletedToast("report.pdf", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getObjectDeletedToast("report.pdf", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Object Deleted")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/was permanently deleted/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectDeletedToast("file.txt", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles object names with special characters", () => {
      const toast = getObjectDeletedToast("my file (2024).txt", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my file/)).toBeInTheDocument()
    })
  })

  // ── getObjectDeleteErrorToast ────────────────────────────────────────────────

  describe("getObjectDeleteErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectDeleteErrorToast("report.pdf", "Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectDeleteErrorToast("report.pdf", "Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectDeleteErrorToast("file.txt", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getObjectDeleteErrorToast("file.txt", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectDeleteErrorToast("file.txt", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Object")).toBeInTheDocument()
    })
  })

  // ── getObjectCopiedToast ─────────────────────────────────────────────────────

  describe("getObjectCopiedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectCopiedToast("report.pdf", "backup", "", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content with container and path", () => {
      const toast = getObjectCopiedToast("report.pdf", "backup-container", "archive/", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Object Copied")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/backup-container/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectCopiedToast("f", "c", "", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty target path (root copy)", () => {
      const toast = getObjectCopiedToast("file.txt", "other-container", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Object Copied")).toBeInTheDocument()
      expect(screen.getByText(/other-container/)).toBeInTheDocument()
    })

    it("handles object names with special characters", () => {
      const toast = getObjectCopiedToast("my file (2024).txt", "backup", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my file \(2024\)\.txt/)).toBeInTheDocument()
    })
  })

  // ── getObjectCopyErrorToast ──────────────────────────────────────────────────

  describe("getObjectCopyErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectCopyErrorToast("report.pdf", "Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectCopyErrorToast("report.pdf", "Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Copy Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not copy/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectCopyErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: 8000 })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("handles different error messages", () => {
      const toast = getObjectCopyErrorToast("file.txt", "Object already exists", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Object already exists/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectCopyErrorToast("file.txt", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Copy Object")).toBeInTheDocument()
    })
  })

  // ── getObjectMovedToast ──────────────────────────────────────────────────────

  describe("getObjectMovedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectMovedToast("report.pdf", "backup", "", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content with container and path", () => {
      const toast = getObjectMovedToast("report.pdf", "backup-container", "archive/", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Object Moved")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/backup-container/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectMovedToast("f", "c", "", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty target path (root move)", () => {
      const toast = getObjectMovedToast("file.txt", "other-container", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Object Moved")).toBeInTheDocument()
      expect(screen.getByText(/other-container/)).toBeInTheDocument()
    })

    it("handles object names with special characters", () => {
      const toast = getObjectMovedToast("my file (2024).txt", "backup", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my file/)).toBeInTheDocument()
    })
  })

  // ── getObjectMoveErrorToast ──────────────────────────────────────────────────

  describe("getObjectMoveErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectMoveErrorToast("report.pdf", "Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectMoveErrorToast("report.pdf", "Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Move Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not move/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectMoveErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: 8000 })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("handles different error messages", () => {
      const toast = getObjectMoveErrorToast("file.txt", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectMoveErrorToast("file.txt", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Move Object")).toBeInTheDocument()
    })
  })

  // ── Toast configuration ──────────────────────────────────────────────────────

  describe("Toast configuration", () => {
    it("all success toasts have success variant and autoDismiss", () => {
      const successToasts = [
        getFolderCreatedToast("f", defaultConfig),
        getFolderDeletedToast("f", 3, defaultConfig),
        getObjectDeletedToast("f", defaultConfig),
        getObjectCopiedToast("f", "c", "", defaultConfig),
        getObjectMovedToast("f", "c", "", defaultConfig),
        getTempUrlCopiedToast("f", defaultConfig),
        getObjectMetadataUpdatedToast("f", defaultConfig),
        getObjectsBulkDeletedToast(3, defaultConfig),
      ]
      successToasts.forEach((toast) => {
        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("all error toasts have error variant and autoDismiss", () => {
      const errorToasts = [
        getFolderCreateErrorToast("f", "err", defaultConfig),
        getFolderDeleteErrorToast("f", "err", defaultConfig),
        getObjectDownloadErrorToast("f", "err", defaultConfig),
        getObjectDeleteErrorToast("f", "err", defaultConfig),
        getObjectCopyErrorToast("f", "err", defaultConfig),
        getObjectMoveErrorToast("f", "err", defaultConfig),
        getObjectMetadataUpdateErrorToast("f", "err", defaultConfig),
        getObjectUploadErrorToast("f", "err", defaultConfig),
        getObjectsBulkDeleteErrorToast("err", defaultConfig),
      ]
      errorToasts.forEach((toast) => {
        expect(toast.variant).toBe("error")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("calls onDismiss callback when invoked", () => {
      const customOnDismiss = vi.fn()
      const toast = getFolderCreatedToast("f", { onDismiss: customOnDismiss })
      toast.onDismiss?.()
      expect(customOnDismiss).toHaveBeenCalledTimes(1)
    })

    it("accepts custom autoDismissTimeout for all toast types", () => {
      const customTimeout = 7500
      const toasts = [
        getFolderCreatedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getFolderCreateErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getFolderDeletedToast("f", 2, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getFolderDeleteErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectDownloadErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectDeletedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectDeleteErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectCopiedToast("f", "c", "", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectCopyErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectMovedToast("f", "c", "", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectMoveErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getTempUrlCopiedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectMetadataUpdatedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectMetadataUpdateErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectUploadedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectUploadErrorToast("f", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectsBulkDeletedToast(3, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getObjectsBulkDeleteErrorToast("err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
      ]
      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })

    it("all toasts return a ReactNode as children", () => {
      const toasts = [
        getFolderCreatedToast("f", defaultConfig),
        getFolderCreateErrorToast("f", "err", defaultConfig),
        getFolderDeletedToast("f", 2, defaultConfig),
        getFolderDeleteErrorToast("f", "err", defaultConfig),
        getObjectDownloadErrorToast("f", "err", defaultConfig),
        getObjectDeleteErrorToast("f", "err", defaultConfig),
        getObjectCopiedToast("f", "c", "", defaultConfig),
        getObjectCopyErrorToast("f", "err", defaultConfig),
        getObjectMovedToast("f", "c", "", defaultConfig),
        getObjectMoveErrorToast("f", "err", defaultConfig),
        getTempUrlCopiedToast("f", defaultConfig),
        getObjectMetadataUpdatedToast("f", defaultConfig),
        getObjectMetadataUpdateErrorToast("f", "err", defaultConfig),
        getObjectUploadedToast("f", defaultConfig),
        getObjectUploadErrorToast("f", "err", defaultConfig),
        getObjectsBulkDeletedToast(3, defaultConfig),
        getObjectsBulkDeleteErrorToast("err", defaultConfig),
      ]
      toasts.forEach((toast) => {
        expect(toast.children).toBeTruthy()
        expect(typeof toast.children).toBe("object")
      })
    })
  })

  // ── getObjectsBulkDeletedToast ───────────────────────────────────────────────

  describe("getObjectsBulkDeletedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectsBulkDeletedToast(5, defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders plural message when multiple objects deleted", () => {
      const toast = getObjectsBulkDeletedToast(5, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Objects Deleted")).toBeInTheDocument()
      expect(screen.getByText(/5 objects were permanently deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly 1 object deleted", () => {
      const toast = getObjectsBulkDeletedToast(1, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/1 object was permanently deleted/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectsBulkDeletedToast(3, { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })
  })

  // ── getObjectsBulkDeleteErrorToast ───────────────────────────────────────────

  describe("getObjectsBulkDeleteErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectsBulkDeleteErrorToast("403 Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectsBulkDeleteErrorToast("403 Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Objects")).toBeInTheDocument()
      expect(screen.getByText(/One or more objects could not be deleted/)).toBeInTheDocument()
      expect(screen.getByText(/403 Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectsBulkDeleteErrorToast("err", { onDismiss: mockOnDismiss, autoDismissTimeout: 10000 })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles multi-line error message (per-path errors)", () => {
      const multiLine = "/container/a.txt: 403 Forbidden\n/container/b.png: 404 Not Found"
      const toast = getObjectsBulkDeleteErrorToast(multiLine, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Objects")).toBeInTheDocument()
    })
  })

  // ── getObjectUploadedToast ──────────────────────────────────────────────────

  describe("getObjectUploadedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectUploadedToast("report.pdf", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getObjectUploadedToast("report.pdf", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Object Uploaded")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/successfully uploaded/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectUploadedToast("report.pdf", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty object name", () => {
      const toast = getObjectUploadedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Object Uploaded")).toBeInTheDocument()
    })
  })

  // ── getObjectUploadErrorToast ────────────────────────────────────────────────

  describe("getObjectUploadErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectUploadErrorToast("report.pdf", "Quota exceeded", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectUploadErrorToast("report.pdf", "Quota exceeded", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Upload Object")).toBeInTheDocument()
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
      expect(screen.getByText(/Could not upload/)).toBeInTheDocument()
      expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectUploadErrorToast("report.pdf", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 8000,
      })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("handles different error messages", () => {
      const toast = getObjectUploadErrorToast("report.pdf", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectUploadErrorToast("report.pdf", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Upload Object")).toBeInTheDocument()
    })
  })

  describe("getTempUrlCopiedToast", () => {
    it("returns success variant", () => {
      const toast = getTempUrlCopiedToast("report.pdf", defaultConfig)
      expect(toast.variant).toBe("success")
    })

    it("uses 4000ms default autoDismissTimeout", () => {
      const toast = getTempUrlCopiedToast("report.pdf", defaultConfig)
      expect(toast.autoDismissTimeout).toBe(4000)
    })

    it("respects custom autoDismissTimeout", () => {
      const toast = getTempUrlCopiedToast("report.pdf", { onDismiss: mockOnDismiss, autoDismissTimeout: 8000 })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("calls onDismiss when dismissed", () => {
      const toast = getTempUrlCopiedToast("report.pdf", defaultConfig)
      toast.onDismiss?.()
      expect(mockOnDismiss).toHaveBeenCalled()
    })

    it("renders object name in description", () => {
      const toast = getTempUrlCopiedToast("report.pdf", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/report\.pdf/)).toBeInTheDocument()
    })
  })

  // ── getObjectMetadataUpdatedToast ────────────────────────────────────────────

  describe("getObjectMetadataUpdatedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getObjectMetadataUpdatedToast("sample.txt", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getObjectMetadataUpdatedToast("sample.txt", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Object Updated")).toBeInTheDocument()
      expect(screen.getByText(/sample\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/successfully updated/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectMetadataUpdatedToast("f", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty object name", () => {
      const toast = getObjectMetadataUpdatedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Object Updated")).toBeInTheDocument()
    })
  })

  // ── getObjectMetadataUpdateErrorToast ────────────────────────────────────────

  describe("getObjectMetadataUpdateErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getObjectMetadataUpdateErrorToast("sample.txt", "Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getObjectMetadataUpdateErrorToast("sample.txt", "Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Update Object")).toBeInTheDocument()
      expect(screen.getByText(/sample\.txt/)).toBeInTheDocument()
      expect(screen.getByText(/Could not update/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getObjectMetadataUpdateErrorToast("f", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 8000,
      })
      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("handles different error messages", () => {
      const toast = getObjectMetadataUpdateErrorToast("sample.txt", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getObjectMetadataUpdateErrorToast("sample.txt", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Update Object")).toBeInTheDocument()
    })
  })
})
