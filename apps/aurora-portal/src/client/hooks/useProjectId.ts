import { useParams } from "@tanstack/react-router"

/**
 * Extract projectId from the current URL.
 *
 * This hook must be used within a project-scoped route.
 * Currently: /accounts/:accountId/projects/:projectId/...
 * Future: /projects/:projectId/...
 *
 * @throws {Error} If used outside of a project route context
 * @returns {string} The current project ID from URL params
 *
 * @example
 * ```tsx
 * function SecurityGroupsList() {
 *   const projectId = useProjectId()
 *
 *   const { data } = trpc.network.securityGroup.list.useQuery({
 *     project_id: projectId
 *   })
 * }
 * ```
 */
export function useProjectId(): string {
  // Extract from current route structure
  // This will be updated in one place when routes are restructured
  const { projectId } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId",
  })

  // Runtime validation - should never happen due to TanStack Router's type safety,
  // but provides clear error message if route configuration is incorrect
  if (!projectId) {
    throw new Error(
      "useProjectId() must be used within a project-scoped route. " +
        "This is likely a routing configuration error. " +
        "Expected route pattern: /accounts/:accountId/projects/:projectId/..."
    )
  }

  return projectId
}
