/**
 * URL-based context hooks
 *
 * These hooks extract scope information (projectId, domainId) directly from URL params.
 * This follows the principle "URL is the source of truth".
 *
 * Benefits:
 * - Centralized URL param extraction (single point of change during route refactoring)
 * - Type-safe access to route params
 * - Runtime validation with clear error messages
 * - No prop drilling needed
 * - Easy to test and mock
 */

export { useProjectId } from "./useProjectId"
export { useDomainId } from "./useDomainId"
