import { useEffect, useRef, useCallback } from "react"

interface UseInactivityTimerProps {
  timeout: number
  onInactive: () => void
  enabled?: boolean
}

export function useInactivityTimer({ timeout, onInactive, enabled = true }: UseInactivityTimerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onInactiveRef = useRef(onInactive)

  // Keep callback ref up to date
  useEffect(() => {
    onInactiveRef.current = onInactive
  }, [onInactive])

  const resetTimer = useCallback(() => {
    if (!enabled) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      onInactiveRef.current()
    }, timeout)
  }, [timeout, enabled])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      return
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const handleActivity = () => {
      resetTimer()
    }

    // Initialize timer
    resetTimer()

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [resetTimer, enabled])

  return { resetTimer }
}
