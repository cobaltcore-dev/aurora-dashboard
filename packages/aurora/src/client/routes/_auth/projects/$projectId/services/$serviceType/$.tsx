import { createFileRoute } from "@tanstack/react-router"

// Catch-all so deep links under /services/$serviceType/** match (no 404). The extension mount
// is rendered by the parent layout route ($serviceType.tsx) so it persists across navigation;
// the extension's own router handles everything below the base path.
export const Route = createFileRoute("/_auth/projects/$projectId/services/$serviceType/$")({
  component: () => null,
})
