import { useMemo } from "react"
import { useParams, useRouteContext } from "@tanstack/react-router"
import type { ServiceExtensionContext } from "@/client/AuroraApp"

/**
 * Looks up the registered service extension for the current $serviceType URL param
 * and renders its component with the correct basePath and host context.
 */
export function ServiceExtensionMount() {
  const { projectId, serviceType } = useParams({ strict: false }) as { projectId: string; serviceType: string }
  const { serviceExtensions } = useRouteContext({ strict: false })
  const extension = serviceExtensions?.find((s) => s.serviceType === serviceType)

  // Memoize so the object reference stays stable across renders and the extension's own
  // createRouter (seeded with this context) is not recreated on every render.
  const context = useMemo<ServiceExtensionContext>(() => ({ projectId }), [projectId])

  if (!extension?.component) return null

  const basePath = `/projects/${projectId}/services/${serviceType}`
  const ServiceComponent = extension.component
  return <ServiceComponent basePath={basePath} context={context} />
}
