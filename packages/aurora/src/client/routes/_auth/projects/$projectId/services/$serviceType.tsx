import { createFileRoute, notFound } from "@tanstack/react-router"
import { ServiceExtensionMount } from "./$serviceType/-components/ServiceExtensionMount"

// Render the extension mount at the layout level so it stays mounted across all
// /services/$serviceType/** navigation. The index and splat child routes exist only to
// match the URL (so deep links don't 404); if the mount rendered in those children instead,
// navigating between them would tear down and rebuild the extension's own RouterProvider,
// losing its state, scroll position, and in-flight fetches.
export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType")({
  staticData: { section: "services" },
  // notFound() must be thrown from a loader, not during render, for TanStack Router to
  // intercept it and show notFoundComponent rather than crashing the error boundary.
  loader: ({ context, params }) => {
    if (!context.serviceExtensions.some((s) => s.serviceType === params.serviceType)) throw notFound()
  },
  component: ServiceExtensionMount,
})
