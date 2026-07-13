/**
 * Scope context hooks
 *
 * These hooks provide access to scope information:
 * - useProjectId: extracts projectId from URL params
 * - useDomainId: extracts domainId from auth context (user's domain)
 * - useScope: combines projectId (URL) and userDomainId (auth context)
 *
 * Benefits:
 * - Centralized scope extraction (single point of change during refactoring)
 * - Type-safe access to scope values
 * - Runtime validation with clear error messages
 * - No prop drilling needed
 * - Easy to test and mock
 */

export { useProjectId } from "./useProjectId"
export { useDomainId } from "./useDomainId"
export { useScope } from "./useScope"
