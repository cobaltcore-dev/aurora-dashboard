import { useParams } from "@tanstack/react-router"

/**
 * Extract projectId from the current URL.
 *
 * This hook works with both old and new route structures:
 * - Old: /accounts/:accountId/projects/:projectId/...
 * - New: /projects/:projectId/...
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
  // Use strict: false to work with any route that has projectId param
  // Works with both:
  // - /accounts/:accountId/projects/:projectId/... (old)
  // - /projects/:projectId/... (new)
  const { projectId } = useParams({
    strict: false,
  })

  // Runtime validation - provides clear error message if projectId is not in URL
  if (!projectId) {
    throw new Error(
      "useProjectId() must be used within a project-scoped route. " +
        "This is likely a routing configuration error. " +
        "Expected route pattern with :projectId parameter"
    )
  }

  return projectId
}
