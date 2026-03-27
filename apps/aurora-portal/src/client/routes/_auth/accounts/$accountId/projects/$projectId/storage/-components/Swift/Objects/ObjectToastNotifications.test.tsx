import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { getFolderCreatedToast, getFolderCreateErrorToast } from "./ObjectToastNotifications"

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

  // ── Toast configuration ──────────────────────────────────────────────────────

  describe("Toast configuration", () => {
    it("success toast has success variant and autoDismiss", () => {
      const toast = getFolderCreatedToast("f", defaultConfig)
      expect(toast.variant).toBe("success")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.onDismiss).toBe(mockOnDismiss)
    })

    it("error toast has error variant and autoDismiss", () => {
      const toast = getFolderCreateErrorToast("f", "err", defaultConfig)
      expect(toast.variant).toBe("error")
      expect(toast.autoDismiss).toBe(true)
      expect(toast.onDismiss).toBe(mockOnDismiss)
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
      ]
      toasts.forEach((toast) => {
        expect(toast.autoDismissTimeout).toBe(customTimeout)
      })
    })

    it("all toasts return a ReactNode as children", () => {
      const toasts = [getFolderCreatedToast("f", defaultConfig), getFolderCreateErrorToast("f", "err", defaultConfig)]
      toasts.forEach((toast) => {
        expect(toast.children).toBeTruthy()
        expect(typeof toast.children).toBe("object")
      })
    })
  })
})
