import { useState, useEffect } from "react"
import { useModalTracking } from "./useModalTracking"

interface UseDeleteConfirmationOptions {
  isOpen: boolean
  confirmWord?: string
  trackingPrefix: string
}

interface UseDeleteConfirmationReturn {
  confirmText: string
  setConfirmText: (text: string) => void
  isConfirmed: boolean
  error: string | null
  setError: (error: string | null) => void
  trackClose: () => void
  markSubmitted: () => void
}

/**
 * Shared hook for delete confirmation modals.
 * Handles confirmation text validation, error state, and analytics tracking.
 *
 * @example
 * const { confirmText, setConfirmText, isConfirmed, error, setError } =
 *   useDeleteConfirmation({
 *     isOpen,
 *     confirmWord: "delete",
 *     trackingPrefix: "compute.flavor",
 *   })
 */
export const useDeleteConfirmation = ({
  isOpen,
  confirmWord = "delete",
  trackingPrefix,
}: UseDeleteConfirmationOptions): UseDeleteConfirmationReturn => {
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const trackingAction = confirmWord === "delete" ? "delete" : confirmWord

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: `${trackingPrefix}.${trackingAction}`,
  })

  const isConfirmed = confirmText.trim() === confirmWord

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConfirmText("")
      setError(null)
      resetTracking()
    }
  }, [isOpen, resetTracking])

  return {
    confirmText,
    setConfirmText,
    isConfirmed,
    error,
    setError,
    trackClose,
    markSubmitted,
  }
}
