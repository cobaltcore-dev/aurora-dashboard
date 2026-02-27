import { describe, it, expect, vi, beforeEach } from "vitest"
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
} from "./ContainerToastNotifications"

describe("ContainerToastNotifications", () => {
  const mockOnDismiss = vi.fn()
  const defaultConfig = { onDismiss: mockOnDismiss }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("getContainerCreatedToast", () => {
    it("should return success toast with correct structure", () => {
      const toast = getContainerCreatedToast("my-container", defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const toast = getContainerCreatedToast("my-container", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Container Created")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully created/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerCreatedToast("my-container", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("should handle container names with special characters", () => {
      const toast = getContainerCreatedToast("my-container/with.special_chars", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my-container\/with\.special_chars/)).toBeInTheDocument()
    })
  })

  describe("getContainerCreateErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const toast = getContainerCreateErrorToast("my-container", "Conflict", defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const toast = getContainerCreateErrorToast("my-container", "Conflict", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Failed to Create Container")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/Could not create container/)).toBeInTheDocument()
      expect(screen.getByText(/Conflict/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const toast = getContainerCreateErrorToast("my-container", "Container already exists", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Container already exists/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerCreateErrorToast("my-container", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("should handle long error messages", () => {
      const longMessage = "Container name already exists in this account and cannot be created again"
      const toast = getContainerCreateErrorToast("my-container", longMessage, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Container name already exists/)).toBeInTheDocument()
    })
  })

  describe("getContainerEmptiedToast", () => {
    it("should return success toast with correct structure", () => {
      const toast = getContainerEmptiedToast("my-container", 5, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message when objects were deleted", () => {
      const toast = getContainerEmptiedToast("my-container", 5, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Container Emptied")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully emptied/)).toBeInTheDocument()
      expect(screen.getByText(/5 objects deleted/)).toBeInTheDocument()
    })

    it("should use singular 'object' when deletedCount is 1", () => {
      const toast = getContainerEmptiedToast("my-container", 1, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/1 object deleted/)).toBeInTheDocument()
    })

    it("should render already empty message when deletedCount is 0", () => {
      const toast = getContainerEmptiedToast("my-container", 0, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Container Emptied")).toBeInTheDocument()
      expect(screen.getByText(/was already empty/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerEmptiedToast("my-container", 3, {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 3000,
      })
      expect(toast.autoDismissTimeout).toBe(3000)
    })
  })

  describe("getContainerEmptyErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error", defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Failed to Empty Container")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/Could not empty container/)).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const toast = getContainerEmptyErrorToast(
        "my-container",
        "Bulk delete operation failed with status 500",
        defaultConfig
      )
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Bulk delete operation failed/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerEmptyErrorToast("my-container", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })
  })

  describe("getContainerDeletedToast", () => {
    it("should return success toast with correct structure", () => {
      const toast = getContainerDeletedToast("my-container", defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const toast = getContainerDeletedToast("my-container", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Container Deleted")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/was successfully deleted/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerDeletedToast("my-container", { onDismiss: mockOnDismiss, autoDismissTimeout: 3000 })
      expect(toast.autoDismissTimeout).toBe(3000)
    })

    it("should handle container names with special characters", () => {
      const toast = getContainerDeletedToast("my-container/with.special_chars", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/my-container\/with\.special_chars/)).toBeInTheDocument()
    })
  })

  describe("getContainerDeleteErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const toast = getContainerDeleteErrorToast("my-container", "Not Found", defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const toast = getContainerDeleteErrorToast("my-container", "Not Found", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Failed to Delete Container")).toBeInTheDocument()
      expect(screen.getByText(/my-container/)).toBeInTheDocument()
      expect(screen.getByText(/Could not delete container/)).toBeInTheDocument()
      expect(screen.getByText(/Not Found/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const toast = getContainerDeleteErrorToast(
        "my-container",
        "Container not found or already deleted",
        defaultConfig
      )
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Container not found or already deleted/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getContainerDeleteErrorToast("my-container", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })
      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("should handle long error messages", () => {
      const longMessage = "Container deletion failed: The container still has active objects that could not be removed"
      const toast = getContainerDeleteErrorToast("my-container", longMessage, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(/Container deletion failed/)).toBeInTheDocument()
    })
  })

  describe("Toast Configuration", () => {
    it("all success toasts should have success variant and autoDismiss", () => {
      const successToasts = [
        getContainerCreatedToast("c", defaultConfig),
        getContainerEmptiedToast("c", 3, defaultConfig),
        getContainerDeletedToast("c", defaultConfig),
      ]
      successToasts.forEach((toast) => {
        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("all error toasts should have error variant and autoDismiss", () => {
      const errorToasts = [
        getContainerCreateErrorToast("c", "err", defaultConfig),
        getContainerEmptyErrorToast("c", "err", defaultConfig),
        getContainerDeleteErrorToast("c", "err", defaultConfig),
      ]
      errorToasts.forEach((toast) => {
        expect(toast.variant).toBe("error")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("should call onDismiss callback when invoked", () => {
      const customOnDismiss = vi.fn()
      const toast = getContainerCreatedToast("c", { onDismiss: customOnDismiss })
      toast.onDismiss?.()
      expect(customOnDismiss).toHaveBeenCalledTimes(1)
    })

    it("should accept custom autoDismissTimeout for all toast types", () => {
      const customTimeout = 7500
      const toasts = [
        getContainerCreatedToast("c", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getContainerCreateErrorToast("c", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getContainerEmptiedToast("c", 3, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getContainerEmptyErrorToast("c", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getContainerDeletedToast("c", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getContainerDeleteErrorToast("c", "err", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
      ]
      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })

    it("all toasts should return ReactNode as children", () => {
      const toasts = [
        getContainerCreatedToast("c", defaultConfig),
        getContainerCreateErrorToast("c", "err", defaultConfig),
        getContainerEmptiedToast("c", 3, defaultConfig),
        getContainerEmptyErrorToast("c", "err", defaultConfig),
        getContainerDeletedToast("c", defaultConfig),
        getContainerDeleteErrorToast("c", "err", defaultConfig),
      ]
      toasts.forEach((toast) => {
        expect(toast.children).toBeTruthy()
        expect(typeof toast.children).toBe("object")
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty container names", () => {
      const toast = getContainerCreatedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Container Created")).toBeInTheDocument()
    })

    it("should handle long container names", () => {
      const longName = "a".repeat(256)
      const toast = getContainerDeletedToast(longName, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument()
    })

    it("should handle empty error messages", () => {
      const toast = getContainerDeleteErrorToast("my-container", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)
      expect(screen.getByText("Failed to Delete Container")).toBeInTheDocument()
    })
  })
})
