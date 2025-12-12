import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
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

  describe("getImageUpdateErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const imageName = "failed-image"
      const message = "Invalid metadata format"
      const toast = getImageUpdateErrorToast(imageName, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const imageName = "failed-image"
      const message = "Invalid metadata format"
      const toast = getImageUpdateErrorToast(imageName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Update Image")).toBeInTheDocument()
      expect(screen.getByText(/failed-image/)).toBeInTheDocument()
      expect(screen.getByText(/could not be updated/)).toBeInTheDocument()
      expect(screen.getByText(/Invalid metadata format/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const imageName = "test-image"
      const message = "Network timeout occurred"
      const toast = getImageUpdateErrorToast(imageName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Network timeout occurred/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getImageUpdateErrorToast("test", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })

      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("should handle long error messages", () => {
      const imageName = "test-image"
      const longMessage =
        "Failed to update image: The request media type application/json is not supported by this server"
      const toast = getImageUpdateErrorToast(imageName, longMessage, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Failed to update image/)).toBeInTheDocument()
      expect(screen.getByText(/application\/json is not supported/)).toBeInTheDocument()
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

  describe("getImageCreateErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const imageName = "failed-image"
      const message = "Invalid file format"
      const toast = getImageCreateErrorToast(imageName, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const imageName = "failed-image"
      const message = "Invalid file format"
      const toast = getImageCreateErrorToast(imageName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Create Image")).toBeInTheDocument()
      expect(screen.getByText(/failed-image/)).toBeInTheDocument()
      expect(screen.getByText(/could not be created/)).toBeInTheDocument()
      expect(screen.getByText(/Invalid file format/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const imageName = "test-image"
      const message = "Storage quota exceeded"
      const toast = getImageCreateErrorToast(imageName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Storage quota exceeded/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getImageCreateErrorToast("test", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 10000,
      })

      expect(toast.autoDismissTimeout).toBe(10000)
    })

    it("should handle long error messages", () => {
      const imageName = "test-image"
      const longMessage = "Failed to create image: The file exceeds the maximum allowed size of 10GB"
      const toast = getImageCreateErrorToast(imageName, longMessage, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Failed to create image/)).toBeInTheDocument()
      expect(screen.getByText(/exceeds the maximum allowed size/)).toBeInTheDocument()
    })
  })

  describe("getImageFileUploadErrorToast", () => {
    it("should return error toast with correct structure", () => {
      const fileName = "large-image.qcow2"
      const message = "Network timeout"
      const toast = getImageFileUploadErrorToast(fileName, message, defaultConfig)

      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.autoDismissTimeout).toBe(5000)
      expect(toast.onDismiss).toBe(mockOnDismiss)
      expect(toast.children).toBeDefined()
    })

    it("should render correct error message content", () => {
      const fileName = "image.qcow2"
      const message = "Connection lost"
      const toast = getImageFileUploadErrorToast(fileName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText("Unable to Upload Image File")).toBeInTheDocument()
      expect(screen.getByText(/image\.qcow2/)).toBeInTheDocument()
      expect(screen.getByText(/Failed to upload file/)).toBeInTheDocument()
      expect(screen.getByText(/Connection lost/)).toBeInTheDocument()
    })

    it("should handle different error messages", () => {
      const fileName = "test-image.img"
      const message = "Insufficient disk space"
      const toast = getImageFileUploadErrorToast(fileName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Insufficient disk space/)).toBeInTheDocument()
    })

    it("should handle file names with special characters", () => {
      const fileName = "my-image_v2.1.qcow2"
      const message = "Upload failed"
      const toast = getImageFileUploadErrorToast(fileName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/my-image_v2\.1\.qcow2/)).toBeInTheDocument()
    })

    it("should use custom autoDismissTimeout when provided", () => {
      const toast = getImageFileUploadErrorToast("file.img", "error", {
        onDismiss: mockOnDismiss,
        autoDismissTimeout: 8000,
      })

      expect(toast.autoDismissTimeout).toBe(8000)
    })

    it("should handle long error messages", () => {
      const fileName = "large-image.qcow2"
      const longMessage =
        "Failed to upload file: Request entity too large. The file size exceeds the maximum allowed limit of 50GB per upload"
      const toast = getImageFileUploadErrorToast(fileName, longMessage, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Failed to upload file/)).toBeInTheDocument()
      expect(screen.getByText(/exceeds the maximum allowed limit/)).toBeInTheDocument()
    })

    it("should handle empty error message", () => {
      const fileName = "image.qcow2"
      const message = ""
      const toast = getImageFileUploadErrorToast(fileName, message, defaultConfig)

      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/image\.qcow2/)).toBeInTheDocument()
      // Should still render title even with empty message
      expect(screen.getByText("Unable to Upload Image File")).toBeInTheDocument()
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

  describe("Bulk Delete Operations", () => {
    describe("getBulkDeleteSuccessToast", () => {
      it("should return success toast with correct structure", () => {
        const toast = getBulkDeleteSuccessToast(3, 3, defaultConfig)

        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(3000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
        expect(toast.children).toBeDefined()
      })

      it("should render correct message for full success", () => {
        const toast = getBulkDeleteSuccessToast(5, 5, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Images Deleted")).toBeInTheDocument()
        expect(screen.getByText(/Successfully deleted 5 of 5 image\(s\)/)).toBeInTheDocument()
      })

      it("should handle single image deletion", () => {
        const toast = getBulkDeleteSuccessToast(1, 1, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText(/Successfully deleted 1 of 1 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeleteErrorToast", () => {
      it("should return error toast with correct structure", () => {
        const toast = getBulkDeleteErrorToast(2, 2, defaultConfig)

        expect(toast.variant).toBe("error")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(5000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })

      it("should render correct error message", () => {
        const toast = getBulkDeleteErrorToast(3, 3, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Failed to Delete Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to delete 3 of 3 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may be protected or in use/)).toBeInTheDocument()
      })

      it("should have longer timeout for error toasts", () => {
        const toast = getBulkDeleteErrorToast(5, 5, defaultConfig)
        expect(toast.autoDismissTimeout).toBe(5000)
      })
    })

    describe("getBulkDeletePartialToast", () => {
      it("should return warning toast with correct structure", () => {
        const toast = getBulkDeletePartialToast(2, 1, defaultConfig)

        expect(toast.variant).toBe("warning")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(5000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })

      it("should render correct partial success message", () => {
        const toast = getBulkDeletePartialToast(7, 3, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Partial Delete Success")).toBeInTheDocument()
        expect(screen.getByText(/Deleted 7 image\(s\), but 3 image\(s\) could not be deleted/)).toBeInTheDocument()
      })

      it("should handle edge case of 1 success 1 failure", () => {
        const toast = getBulkDeletePartialToast(1, 1, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText(/Deleted 1 image\(s\), but 1 image\(s\) could not be deleted/)).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Activate Operations", () => {
    describe("getBulkActivateSuccessToast", () => {
      it("should return success toast with correct structure", () => {
        const toast = getBulkActivateSuccessToast(4, 4, defaultConfig)

        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(3000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })

      it("should render correct success message", () => {
        const toast = getBulkActivateSuccessToast(3, 3, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Images Activated")).toBeInTheDocument()
        expect(screen.getByText(/Successfully activated 3 of 3 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkActivateErrorToast", () => {
      it("should return error toast with correct structure", () => {
        const toast = getBulkActivateErrorToast(2, 2, defaultConfig)

        expect(toast.variant).toBe("error")
        expect(toast.autoDismissTimeout).toBe(5000)
      })

      it("should render correct error message", () => {
        const toast = getBulkActivateErrorToast(4, 4, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Failed to Activate Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to activate 4 of 4 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may already be active or in an invalid state/)).toBeInTheDocument()
      })
    })

    describe("getBulkActivatePartialToast", () => {
      it("should return warning toast with correct structure", () => {
        const toast = getBulkActivatePartialToast(5, 2, defaultConfig)

        expect(toast.variant).toBe("warning")
        expect(toast.autoDismissTimeout).toBe(5000)
      })

      it("should render correct partial success message", () => {
        const toast = getBulkActivatePartialToast(6, 2, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Partial Activation Success")).toBeInTheDocument()
        expect(screen.getByText(/Activated 6 image\(s\), but 2 image\(s\) could not be activated/)).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Deactivate Operations", () => {
    describe("getBulkDeactivateSuccessToast", () => {
      it("should return success toast with correct structure", () => {
        const toast = getBulkDeactivateSuccessToast(3, 3, defaultConfig)

        expect(toast.variant).toBe("success")
        expect(toast.autoDismiss).toBe(true)
        expect(toast.autoDismissTimeout).toBe(3000)
        expect(toast.onDismiss).toBe(mockOnDismiss)
      })

      it("should render correct success message", () => {
        const toast = getBulkDeactivateSuccessToast(8, 8, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Images Deactivated")).toBeInTheDocument()
        expect(screen.getByText(/Successfully deactivated 8 of 8 image\(s\)/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeactivateErrorToast", () => {
      it("should return error toast with correct structure", () => {
        const toast = getBulkDeactivateErrorToast(3, 3, defaultConfig)

        expect(toast.variant).toBe("error")
        expect(toast.autoDismissTimeout).toBe(5000)
      })

      it("should render correct error message", () => {
        const toast = getBulkDeactivateErrorToast(5, 5, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Failed to Deactivate Images")).toBeInTheDocument()
        expect(screen.getByText(/Failed to deactivate 5 of 5 image\(s\)/)).toBeInTheDocument()
        expect(screen.getByText(/Some images may already be deactivated or in an invalid state/)).toBeInTheDocument()
      })
    })

    describe("getBulkDeactivatePartialToast", () => {
      it("should return warning toast with correct structure", () => {
        const toast = getBulkDeactivatePartialToast(4, 1, defaultConfig)

        expect(toast.variant).toBe("warning")
        expect(toast.autoDismissTimeout).toBe(5000)
      })

      it("should render correct partial success message", () => {
        const toast = getBulkDeactivatePartialToast(9, 1, defaultConfig)
        render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

        expect(screen.getByText("Partial Deactivation Success")).toBeInTheDocument()
        expect(
          screen.getByText(/Deactivated 9 image\(s\), but 1 image\(s\) could not be deactivated/)
        ).toBeInTheDocument()
      })
    })
  })

  describe("Bulk Operations - Timeout Configuration", () => {
    it("should use 3000ms timeout for all success toasts", () => {
      const successToasts = [
        getBulkDeleteSuccessToast(1, 1, defaultConfig),
        getBulkActivateSuccessToast(1, 1, defaultConfig),
        getBulkDeactivateSuccessToast(1, 1, defaultConfig),
      ]

      successToasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(3000)
      })
    })

    it("should use 5000ms timeout for all error/warning toasts", () => {
      const errorWarningToasts = [
        getBulkDeleteErrorToast(1, 1, defaultConfig),
        getBulkDeletePartialToast(1, 1, defaultConfig),
        getBulkActivateErrorToast(1, 1, defaultConfig),
        getBulkActivatePartialToast(1, 1, defaultConfig),
        getBulkDeactivateErrorToast(1, 1, defaultConfig),
        getBulkDeactivatePartialToast(1, 1, defaultConfig),
      ]

      errorWarningToasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(5000)
      })
    })

    it("should accept custom timeout for bulk operations", () => {
      const customTimeout = 10000

      const toasts = [
        getBulkDeleteSuccessToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkDeleteErrorToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkDeletePartialToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkActivateSuccessToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkActivateErrorToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkActivatePartialToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkDeactivateSuccessToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkDeactivateErrorToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
        getBulkDeactivatePartialToast(1, 1, { onDismiss: mockOnDismiss, autoDismissTimeout: customTimeout }),
      ]

      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })
  })

  describe("Bulk Operations - Edge Cases", () => {
    it("should handle zero counts gracefully", () => {
      const toast = getBulkDeleteSuccessToast(0, 0, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Successfully deleted 0 of 0 image\(s\)/)).toBeInTheDocument()
    })

    it("should handle large numbers", () => {
      const toast = getBulkActivateSuccessToast(9999, 10000, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Successfully activated 9999 of 10000 image\(s\)/)).toBeInTheDocument()
    })

    it("should handle all toasts having onDismiss callback", () => {
      const customOnDismiss = vi.fn()

      const toasts = [
        getBulkDeleteSuccessToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkDeleteErrorToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkDeletePartialToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkActivateSuccessToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkActivateErrorToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkActivatePartialToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkDeactivateSuccessToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkDeactivateErrorToast(1, 1, { onDismiss: customOnDismiss }),
        getBulkDeactivatePartialToast(1, 1, { onDismiss: customOnDismiss }),
      ]

      toasts.forEach((toast) => {
        expect(toast.onDismiss).toBe(customOnDismiss)
        toast.onDismiss?.()
      })

      expect(customOnDismiss).toHaveBeenCalledTimes(9)
    })

    it("should handle mismatched success and failure counts", () => {
      const toast = getBulkDeletePartialToast(100, 1, defaultConfig)
      render(<I18nProvider i18n={i18n}>{toast.children}</I18nProvider>)

      expect(screen.getByText(/Deleted 100 image\(s\), but 1 image\(s\) could not be deleted/)).toBeInTheDocument()
    })
  })

  describe("Bulk Operations - Variant Types", () => {
    it("should use success variant for complete success operations", () => {
      const successToasts = [
        getBulkDeleteSuccessToast(5, 5, defaultConfig),
        getBulkActivateSuccessToast(5, 5, defaultConfig),
        getBulkDeactivateSuccessToast(5, 5, defaultConfig),
      ]

      successToasts.forEach((toast) => {
        expect(toast.variant).toBe("success")
      })
    })

    it("should use error variant for complete failure operations", () => {
      const errorToasts = [
        getBulkDeleteErrorToast(5, 5, defaultConfig),
        getBulkActivateErrorToast(5, 5, defaultConfig),
        getBulkDeactivateErrorToast(5, 5, defaultConfig),
      ]

      errorToasts.forEach((toast) => {
        expect(toast.variant).toBe("error")
      })
    })

    it("should use warning variant for partial success operations", () => {
      const warningToasts = [
        getBulkDeletePartialToast(3, 2, defaultConfig),
        getBulkActivatePartialToast(3, 2, defaultConfig),
        getBulkDeactivatePartialToast(3, 2, defaultConfig),
      ]

      warningToasts.forEach((toast) => {
        expect(toast.variant).toBe("warning")
      })
    })
  })
})
