import { MailService } from "../services/mailService"

// Mail service singleton instance
let mailServiceInstance: MailService | undefined

/**
 * Initialize mail service with configuration
 * Call this from server startup before registering routes
 */
export function initializeMailService(config: {
  identityEndpoint: string
  limesMailServerEndpoint?: string
  technicalUser?: {
    name: string
    password: string
    domain: string
  }
  defaultEndpointInterface?: string
  proxyUrl?: string
}): void {
  if (config.limesMailServerEndpoint && config.technicalUser) {
    mailServiceInstance = new MailService(config)
    console.log("ℹ️ [notification] Mail service initialized")
  } else if (config.limesMailServerEndpoint || config.technicalUser) {
    console.warn(
      "⚠️ [notification] Mail service partially configured - both limesMailServerEndpoint and technicalUser required"
    )
  }
}

/**
 * Get the mail service instance
 * Returns undefined if not initialized
 */
export function getMailService(): MailService | undefined {
  return mailServiceInstance
}
