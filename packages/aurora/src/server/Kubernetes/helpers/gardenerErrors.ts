import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { SignalOpenstackApiError, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"

/**
 * Gardener failures normally arrive as non-2xx responses whose body is a Kubernetes `Status` object
 * (`kind: "Status"`, `status: "Failure"`, `code`, `message`):
 * https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#response-status-kind
 *
 * QA 2026-11-19: errors arrive as real HTTP statuses with Status bodies; no 2xx error body was observed (Q-I11).
 *
 * 401 Unauthorized (invalid token):
 * Mapped to 502 BAD_GATEWAY with message "The Kubernetes service did not accept the session credentials."
 * to avoid signing out the user (their Keystone session is still valid).
 *
 * Elektra's `{ error, code, message }` envelope comes from Elektra's own Rails layer, not from Gardener, but a
 * 2xx body in either shape is still treated as an error (BRD Q-I11).
 */

export const statusBodySchema = z.object({
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

const GARDENER_FIXED_MESSAGES: Record<number, { code: TRPCError["code"]; message: string }> = {
  400: { code: "BAD_REQUEST", message: "The Kubernetes service rejected the request." },
  401: {
    code: "BAD_GATEWAY",
    message: "The Kubernetes service did not accept the session credentials.",
  },
  403: {
    code: "FORBIDDEN",
    message: "The Kubernetes service refused the request (missing permission or exceeded quota).",
  },
  404: { code: "NOT_FOUND", message: "The requested Kubernetes resource was not found." },
  409: { code: "CONFLICT", message: "The cluster was changed in the meantime. Reload it and try again." },
  422: { code: "UNPROCESSABLE_CONTENT", message: "The Kubernetes service rejected the cluster definition." },
  429: {
    code: "TOO_MANY_REQUESTS",
    message: "The Kubernetes service is receiving too many requests. Try again later.",
  },
  502: { code: "BAD_GATEWAY", message: "The Kubernetes service is temporarily unavailable." },
  503: { code: "BAD_GATEWAY", message: "The Kubernetes service is temporarily unavailable." },
  504: { code: "GATEWAY_TIMEOUT", message: "The Kubernetes service did not respond in time." },
}

/**
 * Redacts secrets from a text string.
 * Replaces each secret (longest first) and any `Bearer <token>` pattern with `[redacted]`.
 */
export function redactSecrets(text: string, secrets: string[]): string {
  let result = text
  // Sort secrets longest first so `<region>:<token>` is replaced before `<token>`
  const sortedSecrets = [...secrets].filter((s) => s).sort((a, b) => b.length - a.length)
  for (const secret of sortedSecrets) {
    result = result.replaceAll(secret, "[redacted]")
  }
  // Also replace Bearer tokens
  result = result.replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
  return result
}

/**
 * Maps an HTTP status from Gardener to a TRPCError.
 *
 * The returned error never carries a `cause`: `openstackErrorMiddleware` re-maps any error whose cause is a
 * SignalOpenstackApiError (a 401 would become a sign-out). See `mapScopeError` in `trpc.ts`.
 */
export function mapGardenerStatus(
  status: number,
  upstream: {
    statusMessage?: string
    rawMessage?: string
    isStatusBody: boolean
  },
  opts: {
    sessionValid: boolean
    secrets: string[]
    operation: string
    landscape: string
  }
): TRPCError {
  // Always log the redacted full message
  const logMessage = redactSecrets(upstream.statusMessage || upstream.rawMessage || "", opts.secrets)
  console.error(`[kubernetes] ${opts.operation} failed`, {
    landscape: opts.landscape,
    status,
    message: logMessage,
  })

  // Compute pass-through message for 400/409/422 Status bodies only
  let clientMessage: string
  if ((status === 400 || status === 409 || status === 422) && upstream.isStatusBody && upstream.statusMessage) {
    const sanitized = redactSecrets(upstream.statusMessage, opts.secrets).trim()
    if (sanitized) {
      clientMessage = sanitized.length > 500 ? sanitized.substring(0, 500) + "…" : sanitized
    } else {
      clientMessage = GARDENER_FIXED_MESSAGES[status]?.message || "The Kubernetes service request failed."
    }
  } else {
    // For 401 with invalid session, use UNAUTHORIZED
    if (status === 401 && !opts.sessionValid) {
      return new TRPCError({ code: "UNAUTHORIZED", message: "Your session is no longer valid." })
    }
    clientMessage = GARDENER_FIXED_MESSAGES[status]?.message || "The Kubernetes service request failed."
  }

  const trpcCode = GARDENER_FIXED_MESSAGES[status]?.code || "INTERNAL_SERVER_ERROR"
  return new TRPCError({ code: trpcCode, message: clientMessage })
}

/** Recognises an error carried in a response body (Kubernetes `Status` Failure or the Elektra envelope). */
export function detectErrorBody(body: unknown): { status: number; message?: string; isStatusBody: boolean } | null {
  const status = statusBodySchema.safeParse(body)
  if (status.success) return { status: status.data.code ?? 500, message: status.data.message, isStatusBody: true }
  const envelope = envelopeBodySchema.safeParse(body)
  if (envelope.success) return { status: envelope.data.code, message: envelope.data.message, isStatusBody: false }
  return null
}

/**
 * Converts an error thrown by a signal-openstack request to Gardener into a TRPCError.
 * Unknown errors are logged and returned as INTERNAL_SERVER_ERROR.
 */
export function mapGardenerError(
  error: unknown,
  ctx: Pick<AuroraPortalContext, "validateSession">,
  timeoutSignal: AbortSignal,
  opts: {
    secrets: string[]
    operation: string
    landscape: string
  }
): TRPCError {
  // A timeout reaches signal-openstack as a TimeoutError, which it wraps as SignalOpenstackApiError(..., 500),
  // so the signal is checked before the error class.
  if (timeoutSignal.aborted) {
    return new TRPCError({ code: "GATEWAY_TIMEOUT", message: "The Kubernetes service did not respond in time." })
  }
  if (error instanceof SignalOpenstackApiError) {
    const isStatusBody = statusBodySchema.safeParse(error.body).success
    const statusMessage = isStatusBody ? (error.body as z.infer<typeof statusBodySchema>).message : undefined
    return mapGardenerStatus(
      error.statusCode ?? 500,
      {
        statusMessage,
        rawMessage: error.message,
        isStatusBody,
      },
      {
        sessionValid: ctx.validateSession() === true,
        secrets: opts.secrets,
        operation: opts.operation,
        landscape: opts.landscape,
      }
    )
  }
  if (error instanceof SignalOpenstackError && error.message === "Request canceled") {
    return new TRPCError({ code: "CLIENT_CLOSED_REQUEST", message: "Request canceled." })
  }
  // Unknown errors: log redacted and return fixed message
  const errorMessage = error instanceof Error ? error.message : String(error)
  const redacted = redactSecrets(errorMessage, opts.secrets)
  console.error(`[kubernetes] ${opts.operation} failed with unknown error`, {
    landscape: opts.landscape,
    message: redacted,
  })
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The Kubernetes service request failed." })
}
