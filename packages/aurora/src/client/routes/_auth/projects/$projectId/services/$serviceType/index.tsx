import { createFileRoute } from "@tanstack/react-router"

// Exists only so the exact /services/$serviceType path matches. The extension mount is
// rendered by the parent layout route ($serviceType.tsx) so it persists across navigation.
export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType/")({
  component: () => null,
})
