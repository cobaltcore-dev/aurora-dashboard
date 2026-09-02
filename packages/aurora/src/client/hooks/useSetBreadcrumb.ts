import { useContext, useLayoutEffect } from "react"
import { DynamicBreadcrumbContext } from "@/client/context/DynamicBreadcrumbContext"

/**
 * Registers a dynamic breadcrumb for a route. Call inside a route component, passing Route.id.
 * The entry is added when text is defined and removed when text becomes undefined or the component unmounts.
 *
 * Requirements:
 * - Must be rendered inside `DynamicBreadcrumbProvider` (mounted at `_auth.tsx`)
 * - Pass `Route.id` as routeId so `useBreadcrumbs` can correlate it with the correct match
 */
export function useSetBreadcrumb(routeId: string, text: string | undefined, options?: { to?: string }) {
  const { setCrumb } = useContext(DynamicBreadcrumbContext)
  const to = options?.to

  useLayoutEffect(() => {
    if (text) {
      setCrumb(routeId, { text, to })
    } else {
      setCrumb(routeId, null)
    }
    return () => setCrumb(routeId, null)
  }, [routeId, text, to, setCrumb])
}
