import { createFileRoute } from "@tanstack/react-router"
import { ServiceExtensionMount } from "./-components/ServiceExtensionMount"

export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType/")({
  component: ServiceExtensionMount,
})
