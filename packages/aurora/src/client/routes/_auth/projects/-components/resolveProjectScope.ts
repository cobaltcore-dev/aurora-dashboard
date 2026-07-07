export type ProjectScopeStatus = "valid" | "not_found" | "scope_failed"

/**
 * Determines the status of a project scope operation by comparing the requested project
 * against the successfully scoped project and the user's available projects.
 *
 * @param input - The scope resolution input
 * @param input.projectId - The project ID that was requested to be scoped
 * @param input.scopeProject - The project object returned from the scope operation (null/undefined if scope failed)
 * @param input.userProjects - List of projects the user has access to (null/undefined if couldn't be fetched)
 *
 * @returns ProjectScopeStatus
 * - "valid": The scope operation succeeded and the scoped project matches the requested project ID
 * - "not_found": The project doesn't exist or the user doesn't have access to it
 * - "scope_failed": The project exists in the user's list but the scope operation failed (e.g., session/backend issue)
 *
 * @example
 * // Successful scope
 * resolveProjectScope({
 *   projectId: "project-123",
 *   scopeProject: { id: "project-123" },
 *   userProjects: [{ id: "project-123" }]
 * }) // returns "valid"
 *
 * @example
 * // Project not found
 * resolveProjectScope({
 *   projectId: "project-999",
 *   scopeProject: undefined,
 *   userProjects: [{ id: "project-123" }]
 * }) // returns "not_found"
 *
 * @example
 * // Scope operation failed for an accessible project
 * resolveProjectScope({
 *   projectId: "project-123",
 *   scopeProject: undefined,
 *   userProjects: [{ id: "project-123" }]
 * }) // returns "scope_failed"
 */
export const resolveProjectScope = (input: {
  projectId: string
  scopeProject: { id?: string } | null | undefined
  userProjects: { id: string }[] | null | undefined
}): ProjectScopeStatus => {
  if (input.scopeProject?.id === input.projectId) {
    return "valid"
  }

  const isInUserProjects = input.userProjects?.some((p) => p.id === input.projectId) ?? false

  return isInUserProjects ? "scope_failed" : "not_found"
}
