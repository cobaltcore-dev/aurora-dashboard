import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { SignalOpenstackApiError, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"

/**
 * Gardener failures normally arrive as non-2xx responses whose body is a Kubernetes `Status` object
 * (`kind: "Status"`, `status: "Failure"`, `code`, `message`):
 * https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#response-status-kind
 *
 * Observed error formats (QA 2026-11-19):
 *
 * 403 Forbidden (no access to resource):
 * ```json
 * {
 *   "kind": "Status",
 *   "apiVersion": "v1",
 *   "metadata": {},
 *   "status": "Failure",
 *   "message": "configmaps \"...\" is forbidden: User \"...\" cannot get resource \"configmaps\" in API group \"\" in the namespace \"...\"",
 *   "reason": "Forbidden",
 *   "details": { "name": "...", "kind": "configmaps" },
 *   "code": 403
 * }
 * ```
 *
 * 401 Unauthorized (invalid token):
 * Mapped to 502 BAD_GATEWAY with message "The Kubernetes service did not accept the session credentials."
 * to avoid signing out the user (their Keystone session is still valid).
 *
 * Note: The oauth2-proxy quirk (BRD Q-I11) — errors returned as HTTP 200 with error in body — was NOT observed.
 * All errors came as proper HTTP status codes.
 *
 * Elektra's `{ error, code, message }` envelope comes from Elektra's own Rails layer, not from Gardener, but a
 * 2xx body in either shape is still treated as an error (BRD Q-I11).
 */

const statusBodySchema = z.object({
  kind: z.literal("Status"),
  status: z.literal("Failure"),
  code: z.number().optional(),
  message: z.string().optional(),
})

const envelopeBodySchema = z.object({
  error: z.string(),
  code: z.number(),
  message: z.string().optional(),
})

/**
 * Maps an HTTP status from Gardener to a TRPCError.
 *
 * The returned error never carries a `cause`: `openstackErrorMiddleware` re-maps any error whose cause is a
 * SignalOpenstackApiError (a 401 would become a sign-out). See `mapScopeError` in `trpc.ts`.
 */
export function mapGardenerStatus(status: number, message: string | undefined, sessionValid: boolean): TRPCError {
  const text = message || `Kubernetes service request failed (${status}).`
  switch (status) {
    case 400:
      return new TRPCError({ code: "BAD_REQUEST", message: text })
    case 401:
      return sessionValid
        ? new TRPCError({
            code: "BAD_GATEWAY",
            message: "The Kubernetes service did not accept the session credentials.",
          })
        : new TRPCError({ code: "UNAUTHORIZED", message: text })
    case 403:
      return new TRPCError({ code: "FORBIDDEN", message: text })
    case 404:
      return new TRPCError({ code: "NOT_FOUND", message: text })
    case 409:
      return new TRPCError({ code: "CONFLICT", message: text })
    case 422:
      return new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: text })
    case 429:
      return new TRPCError({ code: "TOO_MANY_REQUESTS", message: text })
    case 502:
    case 503:
      return new TRPCError({ code: "BAD_GATEWAY", message: text })
    case 504:
      return new TRPCError({ code: "GATEWAY_TIMEOUT", message: text })
    default:
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: text })
  }
}

/** Recognises an error carried in a response body (Kubernetes `Status` Failure or the Elektra envelope). */
export function detectErrorBody(body: unknown): { status: number; message?: string } | null {
  const status = statusBodySchema.safeParse(body)
  if (status.success) return { status: status.data.code ?? 500, message: status.data.message }
  const envelope = envelopeBodySchema.safeParse(body)
  if (envelope.success) return { status: envelope.data.code, message: envelope.data.message }
  return null
}

/**
 * Converts an error thrown by a signal-openstack request to Gardener into a TRPCError.
 * Unknown errors are returned unchanged for `withErrorHandling` to wrap.
 */
export function mapGardenerError(
  error: unknown,
  ctx: Pick<AuroraPortalContext, "validateSession">,
  timeoutSignal: AbortSignal
): unknown {
  // A timeout reaches signal-openstack as a TimeoutError, which it wraps as SignalOpenstackApiError(..., 500),
  // so the signal is checked before the error class.
  if (timeoutSignal.aborted) {
    return new TRPCError({ code: "GATEWAY_TIMEOUT", message: "The Kubernetes service did not respond in time." })
  }
  if (error instanceof SignalOpenstackApiError) {
    return mapGardenerStatus(error.statusCode ?? 500, error.message, ctx.validateSession() === true)
  }
  if (error instanceof SignalOpenstackError && error.message === "Request canceled") {
    return new TRPCError({ code: "CLIENT_CLOSED_REQUEST", message: "Request canceled." })
  }
  return error
}
