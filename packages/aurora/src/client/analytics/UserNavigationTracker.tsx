import { useEffect, useRef } from "react"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { isRouteInfo } from "../routes/routeInfo"
import type { OnUserNavigationCallback, UserNavigationMetrics } from "../AuroraApp"

/**
 * Hook that tracks user navigation for behavioral analytics.
 * Monitors route changes and extracts metrics about which features users access.
 *
 * The callback is executed asynchronously to prevent blocking the UI,
 * even if the consumer's tracking logic is slow or performs network requests.
 *
 * @param onUserNavigation - Optional callback to invoke with navigation metrics
 *
 * @example
 * ```tsx
 * function RootComponent() {
 *   const { onUserNavigation } = useRouteContext()
 *   useUserNavigationTracking(onUserNavigation)
 *   return <Outlet />
 * }
 * ```
 */
export function useUserNavigationTracking(onUserNavigation?: OnUserNavigationCallback) {
  const matches = useMatches()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!onUserNavigation) return

    // Find the deepest route match with valid section/service metadata
    const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))

    if (activeMatch && isRouteInfo(activeMatch.staticData)) {
      const { section, service } = activeMatch.staticData

      // Only track routes with complete feature identification
      if (section && service) {
        const metrics: UserNavigationMetrics = {
          section,
          service,
          pathname,
          routeId: activeMatch.routeId,
        }

        console.log("[Aurora Analytics] User navigation:", {
          feature: `${section}_${service}`,
          section,
          service,
          pathname,
          routeId: activeMatch.routeId,
          timestamp: new Date().toISOString(),
        })

        // Clear any pending callback to avoid duplicate tracking on rapid navigation
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current)
        }

        // Execute callback asynchronously to prevent blocking the UI
        timeoutRef.current = window.setTimeout(() => {
          try {
            onUserNavigation(metrics)
          } catch (error) {
            // Silently catch errors to prevent consumer's tracking logic from breaking the app
            console.error("[Aurora Analytics] Error in onUserNavigation callback:", error)
          }
          timeoutRef.current = null
        }, 0)
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [matches, pathname, onUserNavigation])
}
