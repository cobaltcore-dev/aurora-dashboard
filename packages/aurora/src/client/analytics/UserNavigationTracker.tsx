import { useEffect, useRef } from "react"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { isRouteInfo } from "../routes/routeInfo"
import type { OnUserNavigationCallback, UserNavigationMetrics } from "../AuroraApp"

/**
 * Component that tracks user navigation for behavioral analytics.
 * Monitors route changes and extracts metrics about which features users access.
 *
 * The callback is executed asynchronously to prevent blocking the UI,
 * even if the consumer's tracking logic is slow or performs network requests.
 *
 * This component renders nothing and exists purely for its side effects.
 * Using a component instead of a hook prevents unnecessary re-renders of parent components.
 *
 * @param onUserNavigation - Optional callback to invoke with navigation metrics
 *
 * @example
 * ```tsx
 * function RootComponent() {
 *   const { onUserNavigation } = useRouteContext()
 *   return (
 *     <Layout>
 *       <UserNavigationTracker onUserNavigation={onUserNavigation} />
 *       <Outlet />
 *     </Layout>
 *   )
 * }
 * ```
 */
export function UserNavigationTracker({ onUserNavigation }: { onUserNavigation?: OnUserNavigationCallback }) {
  const matches = useMatches()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const timeoutRef = useRef<number | null>(null)
  const lastRouteKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!onUserNavigation) return

    // Find the deepest route match with valid section/service metadata
    const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))

    if (activeMatch && isRouteInfo(activeMatch.staticData)) {
      const { section, service } = activeMatch.staticData

      // Only track routes with complete feature identification
      if (section && service) {
        // Create a unique key for this route to prevent duplicate emissions
        const routeKey = `${activeMatch.routeId}:${pathname}`

        // Skip if this is the same route (prevents duplicate emissions when callback reference changes)
        if (lastRouteKeyRef.current === routeKey) {
          return
        }

        lastRouteKeyRef.current = routeKey

        const metrics: UserNavigationMetrics = {
          source: "router",
          action: `${section}_${service}`,
          metadata: {
            pathname,
            routeId: activeMatch.routeId,
            section,
            service,
          },
        }

        // Clear any pending callback to avoid duplicate tracking on rapid navigation
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current)
        }

        // Execute callback asynchronously to prevent blocking the UI
        timeoutRef.current = window.setTimeout(() => {
          // Wrap in Promise.resolve to handle both sync and async callbacks
          Promise.resolve()
            .then(() => onUserNavigation(metrics))
            .catch((error) => {
              // Catch both sync and async errors to prevent consumer's tracking logic from breaking the app
              console.error("[Aurora Analytics] Error in onUserNavigation callback:", error)
            })
            .finally(() => {
              timeoutRef.current = null
            })
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

  return null
}
