import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { protectedProcedure, router } from "../trpc"

const sendEmailInputSchema = z.object({
  recipients: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, "Subject cannot be empty"),
  bodyHtml: z.string().min(1, "Email body cannot be empty"),
})

export const notificationRouters = router({
  /**
   * Send a custom email via the mail service
   * Requires authentication but not project/domain scoping
   */
  sendEmail: protectedProcedure.input(sendEmailInputSchema).mutation(async ({ ctx, input }) => {
    // Get mail service from context
    if (!ctx.mailService) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Mail service is not configured",
      })
    }

    try {
      await ctx.mailService.sendEmail({
        recipients: input.recipients,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
      })

      return {
        success: true,
        message: "Email sent successfully",
      }
    } catch (error) {
      console.error("[notificationRouters] Failed to send email:", error)

      // Determine appropriate error code based on error type
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      if (errorMessage.includes("timeout")) {
        throw new TRPCError({
          code: "TIMEOUT",
          message: "Email service timeout. Please try again.",
        })
      }

      if (errorMessage.includes("connection")) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to email service",
        })
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to send email: ${errorMessage}`,
      })
    }
  }),
})
