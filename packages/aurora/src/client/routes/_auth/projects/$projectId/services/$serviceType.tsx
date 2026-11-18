import { createFileRoute, notFound, redirect, isRedirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ServiceExtensionMount } from "./$serviceType/-components/ServiceExtensionMount"

// Render the extension mount at the layout level so it stays mounted across all
// /services/$serviceType/** navigation. The index and splat child routes exist only to
// match the URL (so deep links don't 404); if the mount rendered in those children instead,
// navigating between them would tear down and rebuild the extension's own RouterProvider,
// losing its state, scroll position, and in-flight fetches.
export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType")({
  staticData: { section: "services" },
  // Guard the route so an extension that is hidden from the nav/home page can't be reached by typing
  // its URL directly. This mirrors the nav gating in buildNavSections (enabledServices/deniedServices
  // + OpenStack catalog lookup) so direct links honor the same visibility rules. A disabled service
  // redirects to the project home page; an unknown serviceType still 404s via notFound().
  beforeLoad: async ({ context, params }) => {
    const { serviceExtensions, enabledServices, deniedServices, trpcClient } = context
    const { projectId, serviceType } = params

    const extension = serviceExtensions.find((s) => s.serviceType === serviceType)
    // Unknown extension: keep the existing not-found behavior.
    if (!extension) throw notFound()

    // Honor the appConfig service visibility (allow/deny lists) the nav uses. Deny always wins,
    // even with no allow list.
    const isEnabled =
      (!enabledServices || enabledServices.includes(serviceType)) && !deniedServices?.includes(serviceType)
    if (!isEnabled) {
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }

    // Verify the service is actually present in the project's OpenStack catalog, matching the
    // serviceType/serviceName check the nav and project home page perform.
    try {
      const availableServices = await trpcClient?.auth.getAvailableServices.query()
      const serviceIndex = getServiceIndex(availableServices ?? [])
      if (!serviceIndex[extension.serviceType]?.[extension.serviceName]) {
        throw redirect({ to: "/projects/$projectId", params: { projectId } })
      }
    } catch (err) {
      if (isRedirect(err)) throw err
      // Network/tRPC error — redirect to the project page rather than surfacing an error component.
      throw redirect({ to: "/projects/$projectId", params: { projectId } })
    }
  },
  component: ServiceExtensionMount,
})
