import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
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

describe("BucketToastNotifications", () => {
  const mockOnDismiss = vi.fn()
  const defaultConfig = { onDismiss: mockOnDismiss }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  // ── getBucketCreatedToast ────────────────────────────────────────────────────

  describe("getBucketCreatedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getBucketCreatedToast("my-bucket", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getBucketCreatedToast("my-bucket", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Created")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketCreatedToast("my-bucket", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles bucket names with special characters", () => {
      const toast = getBucketCreatedToast("my-bucket-2024", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/my-bucket-2024/)).toBeInTheDocument()
    })

    it("handles empty bucket name", () => {
      const toast = getBucketCreatedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Created")).toBeInTheDocument()
    })
  })

  // ── getBucketCreateErrorToast ────────────────────────────────────────────────

  describe("getBucketCreateErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "Conflict", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "Conflict", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Create Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not create bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "Bucket already exists", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/Bucket already exists/)).toBeInTheDocument()
    })

    it("handles long error messages", () => {
      const longMessage = "The server encountered an internal error and was unable to complete your request"
      const toast = getBucketCreateErrorToast("my-bucket", longMessage, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/The server encountered an internal error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getBucketCreateErrorToast("my-bucket", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Create Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketEmptiedToast ────────────────────────────────────────────────────

  describe("getBucketEmptiedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getBucketEmptiedToast("my-bucket", 5, defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders plural message when multiple objects were deleted", () => {
      const toast = getBucketEmptiedToast("my-bucket", 5, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects deleted/)).toBeInTheDocument()
    })

    it("renders singular message when exactly 1 object was deleted", () => {
      const toast = getBucketEmptiedToast("my-bucket", 1, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/1 object deleted/)).toBeInTheDocument()
    })

    it("renders already empty message when deletedCount is 0", () => {
      const toast = getBucketEmptiedToast("my-bucket", 0, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
      expect(screen.getByText(/was already empty/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketEmptiedToast("my-bucket", 3, { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles empty bucket name", () => {
      const toast = getBucketEmptiedToast("", 2, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Emptied")).toBeInTheDocument()
    })
  })

  // ── getBucketEmptyErrorToast ────────────────────────────────────────────────

  describe("getBucketEmptyErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "Internal Server Error", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Empty Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not empty bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "Bulk delete failed", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/Bulk delete failed/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getBucketEmptyErrorToast("my-bucket", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Empty Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketDeletedToast ────────────────────────────────────────────────────

  describe("getBucketDeletedToast", () => {
    it("returns success toast with correct structure", () => {
      const toast = getBucketDeletedToast("my-bucket", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct message content", () => {
      const toast = getBucketDeletedToast("my-bucket", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Bucket Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketDeletedToast("my-bucket", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("handles bucket names with special characters", () => {
      const toast = getBucketDeletedToast("my-bucket-2024", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/my-bucket-2024/)).toBeInTheDocument()
    })
  })

  // ── getBucketDeleteErrorToast ────────────────────────────────────────────────

  describe("getBucketDeleteErrorToast", () => {
    it("returns error toast with correct structure", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "Forbidden", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders correct error message content", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "Forbidden", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Bucket")).toBeInTheDocument()
      expect(screen.getByText(/my-bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete bucket/)).toBeInTheDocument()
      expect(screen.getByText(/Forbidden/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "err", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("handles different error messages", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("handles empty error message", () => {
      const toast = getBucketDeleteErrorToast("my-bucket", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Bucket")).toBeInTheDocument()
    })
  })

  // ── getBucketsEmptyCompleteToast ─────────────────────────────────────────────

  describe("getBucketsEmptyCompleteToast", () => {
    it("returns success toast when no errors", () => {
      const toast = getBucketsEmptyCompleteToast(5, 120, [], defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("renders success message with correct bucket and object counts", () => {
      const toast = getBucketsEmptyCompleteToast(5, 120, [], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("All Buckets Emptied")).toBeInTheDocument()
      expect(screen.getByText(/5 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/120 objects/)).toBeInTheDocument()
    })

    it("renders success message with singular bucket", () => {
      const toast = getBucketsEmptyCompleteToast(1, 10, [], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/1 bucket/)).toBeInTheDocument()
      expect(screen.getByText(/10 objects/)).toBeInTheDocument()
    })

    it("renders success message with singular object", () => {
      const toast = getBucketsEmptyCompleteToast(2, 1, [], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/2 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/1 object/)).toBeInTheDocument()
    })

    it("returns warning toast when there are errors", () => {
      const toast = getBucketsEmptyCompleteToast(3, 100, ["bucket1", "bucket2"], defaultConfig)
      expect(toast.variant).toBe("warning")
      expect(toast.autoDismiss).toBe(false)
      expect(toast.onDismiss).toBe(mockOnDismiss)
    })

    it("renders warning message with correct counts when errors exist", () => {
      const toast = getBucketsEmptyCompleteToast(3, 100, ["bucket1", "bucket2"], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText("Empty All Completed with Errors")).toBeInTheDocument()
      expect(screen.getByText(/Successfully emptied 3 of 5 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/100 objects/)).toBeInTheDocument()
      expect(screen.getByText(/2 buckets failed/)).toBeInTheDocument()
    })

    it("renders warning with singular failed bucket", () => {
      const toast = getBucketsEmptyCompleteToast(2, 50, ["bucket1"], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/1 bucket failed/)).toBeInTheDocument()
    })

    it("uses custom autoDismissTimeout when provided", () => {
      const toast = getBucketsEmptyCompleteToast(5, 120, [], { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("does not auto-dismiss when there are errors", () => {
      const toast = getBucketsEmptyCompleteToast(3, 100, ["bucket1"], defaultConfig)
      expect(toast.autoDismiss).toBe(false)
    })

    it("handles zero emptied buckets with errors", () => {
      const toast = getBucketsEmptyCompleteToast(0, 0, ["bucket1", "bucket2", "bucket3"], defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children as React.ReactNode}</I18nProvider>)
      expect(screen.getByText(/0 of 3 buckets/)).toBeInTheDocument()
      expect(screen.getByText(/3 buckets failed/)).toBeInTheDocument()
    })
  })

  // ── Toast configuration ──────────────────────────────────────────────────────

  describe("Toast configuration", () => {
    it("all success toasts have success variant and autoDismiss", () => {
      const successToasts = [
        getBucketCreatedToast("b", defaultConfig),
        getBucketEmptiedToast("b", 5, defaultConfig),
        getBucketDeletedToast("b", defaultConfig),
        getBucketsEmptyCompleteToast(3, 100, [], defaultConfig),
      ]
      successToasts.forEach((toast) => {
        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("all error toasts have error variant and autoDismiss", () => {
      const errorToasts = [
        getBucketCreateErrorToast("b", "err", defaultConfig),
        getBucketEmptyErrorToast("b", "err", defaultConfig),
        getBucketDeleteErrorToast("b", "err", defaultConfig),
      ]
      errorToasts.forEach((toast) => {
        expect(toast.variant).toBe("error")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("calls onDismiss callback when invoked", () => {
      const customOnDismiss = vi.fn()
      const toast = getBucketCreatedToast("b", { onDismiss: customOnDismiss })
      toast.onDismiss?.()
      expect(customOnDismiss).toHaveBeenCalledTimes(1)
    })

    it("accepts custom autoDismissTimeout for all toast types", () => {
      const customTimeout = 7500
      const toasts = [
        getBucketCreatedToast("b", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketCreateErrorToast("b", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketEmptiedToast("b", 5, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketEmptyErrorToast("b", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketDeletedToast("b", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketDeleteErrorToast("b", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBucketsEmptyCompleteToast(3, 100, [], { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
      ]
      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })

    it("all toasts return a ReactNode as children", () => {
      const toasts = [
        getBucketCreatedToast("b", defaultConfig),
        getBucketCreateErrorToast("b", "err", defaultConfig),
        getBucketEmptiedToast("b", 5, defaultConfig),
        getBucketEmptyErrorToast("b", "err", defaultConfig),
        getBucketDeletedToast("b", defaultConfig),
        getBucketDeleteErrorToast("b", "err", defaultConfig),
        getBucketsEmptyCompleteToast(3, 100, [], defaultConfig),
      ]
      toasts.forEach((toast) => {
        expect(toast.children).toBeTruthy()
        expect(typeof toast.children).toBe("object")
      })
    })
  })
})
