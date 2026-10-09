import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"

type ErrorResponse = { status?: number; statusText?: string }

/** An operation-specific error handler, e.g. `RouterErrorHandlers.get` or `PortErrorHandlers.delete`. */
export type NetworkErrorHandler = (response: ErrorResponse, resourceLabel?: string) => TRPCError

/**
 * Runs a Neutron request and maps any failure through the operation's error handler.
 *
 * signal-openstack rejects every non-2xx response with SignalOpenstackApiError, so a plain
 * `if (!response.ok)` check never runs and the error would reach `withErrorHandling` as INTERNAL_SERVER_ERROR.
 * The error's `message` is Neutron's own message parsed from the JSON body (e.g. NeutronError.message
 * "Quota exceeded for resources: ['router']."), so it is passed to the handler as `statusText`.
 * Network failures are wrapped by the client as SignalOpenstackApiError with status 500 and end up in the default handler.
 * The `!response.ok` branch only guards against clients that resolve with error responses.
 */
export const requestOrThrow = async <T extends { ok: boolean; status: number; statusText?: string }>(
  request: () => Promise<T>,
  handleError: NetworkErrorHandler,
  resourceLabel?: string
): Promise<T> => {
  let response: T
  try {
    response = await request()
  } catch (error) {
    if (error instanceof SignalOpenstackApiError) {
      throw handleError({ status: error.statusCode, statusText: error.message }, resourceLabel)
    }
    throw error
  }

  if (!response.ok) throw handleError(response, resourceLabel)
  return response
}

/** Returns a shallow copy of `obj` without keys whose value is `undefined`. */
export const pickDefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>

/** Splits items into chunks of at most `size` items (e.g. to keep query strings short). */
export const chunk = <T>(items: T[], size: number): T[][] => {
  if (size < 1) throw new Error("Chunk size must be at least 1")
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/** Appends the query string to `baseUrl`, or returns `baseUrl` unchanged when there are no params. */
export const withQuery = (baseUrl: string, params: URLSearchParams): string => {
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}
