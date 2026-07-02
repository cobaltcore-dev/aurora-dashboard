import { useEffect, useRef } from "react"
import { useRouteContext } from "@tanstack/react-router"

interface UseModalTrackingOptions {
  isOpen: boolean
  actionPrefix: string // e.g., "storage.ceph.bucket.create"
}

interface UseModalTrackingReturn {
  trackClose: () => void
  markSubmitted: () => void
  resetTracking: () => void
}

/**
 * Custom hook to handle modal open/close analytics tracking.
 *
 * Tracks:
 * - `.open` event when modal opens (once per modal open)
 * - `.close` event when modal closes without submission (cancelled)
 *
 * @example
 * const { trackClose, markSubmitted, resetTracking } = useModalTracking({
 *   isOpen,
 *   actionPrefix: "storage.ceph.bucket.create"
 * })
 *
 * // In handleClose:
 * trackClose()
 *
 * // In handleSubmit:
 * markSubmitted()
 *
 * // In cleanup/reset:
 * resetTracking()
 */
export const useModalTracking = ({ isOpen, actionPrefix }: UseModalTrackingOptions): UseModalTrackingReturn => {
  const { onTrackEvent } = useRouteContext({ strict: false })
  const hasTrackedOpen = useRef(false)
  // Use useRef instead of useState to avoid timing race with synchronous close paths
  // See: https://github.com/... - setState doesn't apply until next render, so trackClose()
  // could read stale hasSubmitted === false even after markSubmitted() was called
  const hasSubmitted = useRef(false)

  // Track when user opens the modal (once per modal open)
  useEffect(() => {
    if (isOpen && !hasTrackedOpen.current) {
      onTrackEvent?.({
        source: "modal",
        action: `${actionPrefix}.open`,
      })
      hasTrackedOpen.current = true
    }
  }, [isOpen, onTrackEvent, actionPrefix])

  /**
   * Track close event if user didn't submit.
   * Call this at the start of your handleClose function.
   */
  const trackClose = () => {
    if (isOpen && !hasSubmitted.current) {
      onTrackEvent?.({
        source: "modal",
        action: `${actionPrefix}.close`,
      })
    }
  }

  /**
   * Mark that the user submitted the form.
   * Call this in your handleSubmit function before the mutation.
   */
  const markSubmitted = () => {
    hasSubmitted.current = true
  }

  /**
   * Reset tracking state.
   * Call this in handleClose after tracking close event.
   */
  const resetTracking = () => {
    hasSubmitted.current = false
    hasTrackedOpen.current = false
  }

  return {
    trackClose,
    markSubmitted,
    resetTracking,
  }
}
