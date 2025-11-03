import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import {
  getImageUpdatedToast,
  getImageCreatedToast,
  getImageDeletedToast,
  getImageDeleteErrorToast,
  getImageActivatedToast,
  getImageDeactivatedToast,
  getImageActivationErrorToast,
  getImageDeactivationErrorToast,
} from "./ImageToastNotifications"

describe("ImageToastNotifications", () => {
  const mockOnDismiss = vi.fn()
  const defaultConfig = { onDismiss: mockOnDismiss }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("getImageUpdatedToast", () => {
    it("should return success toast with correct structure", () => {
      const imageName = "test-image"
      const toast = getImageUpdatedToast(imageName, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const imageName = "test-image"
      const toast = getImageUpdatedToast(imageName, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/test-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been updated/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getImageUpdatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: 5000 })

      expect(toast.autoDismissTimeout).toBe(5000)
    })
  })

  describe("getImageCreatedToast", () => {
    it("should return success toast with correct structure", () => {
      const imageName = "new-image"
      const toast = getImageCreatedToast(imageName, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const imageName = "new-image"
      const toast = getImageCreatedToast(imageName, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/new-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been created/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getImageCreatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: 10000 })

      expect(toast.autoDismissTimeout).toBe(10000)
    })
  })

  describe("getImageDeletedToast", () => {
    it("should return success toast with correct structure", () => {
      const imageName = "deleted-image"
      const toast = getImageDeletedToast(imageName, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const imageName = "deleted-image"
      const toast = getImageDeletedToast(imageName, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/deleted-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been deleted/)).toBeInTheDocument()
    })
  })

  describe("getImageDeleteErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const imageId = "error-image-id"
      const message = "Permission denied"
      const toast = getImageDeleteErrorToast(imageId, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const imageId = "error-image-id"
      const message = "Permission denied"
      const toast = getImageDeleteErrorToast(imageId, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Delete Image")).toBeInTheDocument()
      expect(screen.getByText(/error-image-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be deleted/)).toBeInTheDocument()
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const imageId = "test-id"
      const message = "Network error occurred"
      const toast = getImageDeleteErrorToast(imageId, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Network error occurred/)).toBeInTheDocument()
    })
  })

  describe("getImageActivatedToast", () => {
    it("should return success toast with correct structure", () => {
      const imageName = "activated-image"
      const toast = getImageActivatedToast(imageName, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const imageName = "activated-image"
      const toast = getImageActivatedToast(imageName, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/activated-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been activated/)).toBeInTheDocument()
    })
  })

  describe("getImageDeactivatedToast", () => {
    it("should return success toast with correct structure", () => {
      const imageName = "deactivated-image"
      const toast = getImageDeactivatedToast(imageName, defaultConfig)

      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct message content", () => {
      const imageName = "deactivated-image"
      const toast = getImageDeactivatedToast(imageName, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
      expect(screen.getByText(/deactivated-image/)).toBeInTheDocument()
      expect(screen.getByText(/has been deactivated/)).toBeInTheDocument()
    })
  })

  describe("getImageActivationErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const imageId = "activation-error-id"
      const message = "Service unavailable"
      const toast = getImageActivationErrorToast(imageId, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const imageId = "activation-error-id"
      const message = "Service unavailable"
      const toast = getImageActivationErrorToast(imageId, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Re-activate Image")).toBeInTheDocument()
      expect(screen.getByText(/activation-error-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be re-activated/)).toBeInTheDocument()
      expect(screen.getByText(/Service unavailable/)).toBeInTheDocument()
    })
  })

  describe("getImageDeactivationErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const imageId = "deactivation-error-id"
      const message = "Image is in use"
      const toast = getImageDeactivationErrorToast(imageId, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(3000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const imageId = "deactivation-error-id"
      const message = "Image is in use"
      const toast = getImageDeactivationErrorToast(imageId, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Deactivate Image")).toBeInTheDocument()
      expect(screen.getByText(/deactivation-error-id/)).toBeInTheDocument()
      expect(screen.getByText(/could not be deactivated/)).toBeInTheDocument()
      expect(screen.getByText(/Image is in use/)).toBeInTheDocument()
    })
  })

  describe("Toast Configuration", () => {
    it("all success toasts should have the same default configuration", () => {
      const successToasts = [
        getImageUpdatedToast("test", defaultConfig),
        getImageCreatedToast("test", defaultConfig),
        getImageDeletedToast("test", defaultConfig),
        getImageActivatedToast("test", defaultConfig),
        getImageDeactivatedToast("test", defaultConfig),
      ]

      successToasts.forEach((toast) => {
        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(3000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("all error toasts should have the same default configuration", () => {
      const errorToasts = [
        getImageDeleteErrorToast("test", "error", defaultConfig),
        getImageActivationErrorToast("test", "error", defaultConfig),
        getImageDeactivationErrorToast("test", "error", defaultConfig),
      ]

      errorToasts.forEach((toast) => {
        expect(toast.variant).toBe("error")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(3000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })
    })

    it("should call onDismiss callback when provided", () => {
      const customOnDismiss = vi.fn()
      const toast = getImageUpdatedToast("test", { onDismiss: customOnDismiss })

      expect(toast.onDismiss).toBe(customOnDismiss)
      toast.onDismiss?.()
      expect(customOnDismiss).toHaveBeenCalledTimes(1)
    })

    it("should accept custom autoDismissTimeout for all toast types", () => {
      const customTimeout = 7500

      const toasts = [
        getImageUpdatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageCreatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageDeletedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageDeleteErrorToast("test", "error", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageActivatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageDeactivatedToast("test", { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getImageActivationErrorToast("test", "error", {
          onDismiss: mockOnDismiss,
          autoDismissTimeout: customTimeout,
        }),
        getImageDeactivationErrorToast("test", "error", {
          onDismiss: mockOnDismiss,
          autoDismissTimeout: customTimeout,
        }),
      ]

      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty string image names", () => {
      const toast = getImageUpdatedToast("", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Image Instance")).toBeInTheDocument()
    })

    it("should handle special characters in image names", () => {
      const specialName = "test-image_v1.2.3@latest"
      const toast = getImageCreatedToast(specialName, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/test-image_v1.2.3@latest/)).toBeInTheDocument()
    })

    it("should handle long image names", () => {
      const longName = "a".repeat(100)
      const toast = getImageDeletedToast(longName, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument()
    })

    it("should handle empty error messages", () => {
      const toast = getImageDeleteErrorToast("test-id", "", defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Delete Image")).toBeInTheDocument()
    })

    it("should handle long error messages", () => {
      const longMessage = "Error: " + "x".repeat(200)
      const toast = getImageActivationErrorToast("test-id", longMessage, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(new RegExp(longMessage))).toBeInTheDocument()
    })
  })

  describe("Return Type Validation", () => {
    it("should return ToastProps with all required properties", () => {
      const toast = getImageUpdatedToast("test", defaultConfig)

      expect(toast).toHaveProperty("variant")
      expect(toast).toHaveProperty("children")
      expect(toast).toHaveProperty("autoDismiss")
      expect(toast).toHaveProperty("autoDismissTimeout")
      expect(toast).toHaveProperty("onDismiss")
    })

    it("should return ReactNode as children", () => {
      const toast = getImageCreatedToast("test", defaultConfig)

      expect(toast.children).toBeTruthy()
      expect(typeof toast.children).toBe("object")
    })
  })
})
