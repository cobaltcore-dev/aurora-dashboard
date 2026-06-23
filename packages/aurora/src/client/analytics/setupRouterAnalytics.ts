import { isRouteInfo } from "../routes/routeInfo"
import { createAuroraRouter } from "../router"

/**
 * Sets up analytics tracking for router navigation events.
 * Subscribes to the router's "onResolved" event and emits analytics events
 * when users navigate between routes. Metadata always includes `pathname`,
 * includes `search` when query params are present, and includes `section`/`service`
 * when available via route `staticData`.
 *
 * @param router - The TanStack Router instance
 * @returns Cleanup function to unsubscribe from router events
 *
 * @example
 * ```tsx
 * const router = createAuroraRouter(trpcReact, trpcClient)
 * const cleanup = setupRouterAnalytics(router)
 * // Later, when unmounting:
 * cleanup()
 * ```
 */
export function setupRouterAnalytics(router: ReturnType<typeof createAuroraRouter>): () => void {
  return router.subscribe("onResolved", () => {
    const { onTrackEvent } = router.options.context

    if (!onTrackEvent) return

    // Get the deepest (most specific) match
    const deepestMatch = router.state.matches[router.state.matches.length - 1]

    if (!deepestMatch) return

    // Build metadata: always include pathname, add search/section/service if available
    const searchString = router.state.location.searchStr
    const metadata: Record<string, string | number | boolean | undefined> = {
      pathname: router.state.location.pathname,
    }

    // Only include search if there's a query string
    if (searchString) {
      metadata.search = searchString
    }

    // Check if route has section/service metadata and add them if present
    if (isRouteInfo(deepestMatch.staticData)) {
      const { section, service } = deepestMatch.staticData
      if (section) metadata.section = section
      if (service) metadata.service = service
    }

    const payload = {
      source: "router",
      action: deepestMatch.routeId,
      metadata,
    }

    try {
      onTrackEvent(payload)
    } catch (error) {
      console.error("onTrackEvent callback threw:", error)
    }
  })
}
