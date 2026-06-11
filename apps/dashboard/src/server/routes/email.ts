import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { getMailService } from "../routers/notification"

const sendEmailSchema = z.object({
  recipients: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, "Subject cannot be empty"),
  bodyHtml: z.string().min(1, "Email body cannot be empty"),
})

/**
 * Register custom email endpoint for dashboard
 * POST /polaris-bff/send-email
 */
export function registerEmailEndpoint(server: FastifyInstance, bffEndpoint: string): void {
  server.post(`${bffEndpoint}/send-email`, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Simple session check - look for the session cookie
      const sessionCookie = (request as any).cookies?.["dashboard-session-auth"]
      if (!sessionCookie) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      // Validate request body
      const body = sendEmailSchema.parse(request.body)

      // Get mail service
      const mailService = getMailService()
      if (!mailService) {
        return reply.code(500).send({ error: "Mail service is not configured" })
      }

      // Send email
      await mailService.sendEmail({
        recipients: body.recipients,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
      })

      return reply.code(200).send({ success: true, message: "Email sent successfully" })
    } catch (error) {
      console.error("[send-email] Error:", error)

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: "Invalid request", details: error.errors })
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      if (errorMessage.includes("timeout")) {
        return reply.code(408).send({ error: "Email service timeout" })
      }

      if (errorMessage.includes("connection")) {
        return reply.code(503).send({ error: "Failed to connect to email service" })
      }

      return reply.code(500).send({ error: `Failed to send email: ${errorMessage}` })
    }
  })

  console.log("ℹ️ [dashboard] Custom email endpoint registered at POST", `${bffEndpoint}/send-email`)
}
