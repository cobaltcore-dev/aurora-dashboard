import { SignalOpenstackSession, SignalOpenstackSessionType } from "@cobaltcore-dev/signal-openstack"

export interface MailServiceConfig {
  identityEndpoint: string
  limesMailServerEndpoint?: string
  technicalUser?: {
    name: string
    password: string
    domain: string
  }
  defaultEndpointInterface?: string
  proxyUrl?: string
}

export interface SendEmailParams {
  recipients: string | string[]
  subject: string
  bodyHtml: string
}

export class MailService {
  private config: MailServiceConfig
  private technicalUserSession?: Awaited<SignalOpenstackSessionType>
  private sessionPromise?: Promise<Awaited<SignalOpenstackSessionType>>

  constructor(config: MailServiceConfig) {
    this.config = config
  }

  /**
   * Send a custom email via Limes mail server
   * Uses technical user credentials to authenticate with OpenStack
   */
  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!this.config.limesMailServerEndpoint) {
      console.info("[MailService] Skipping email: limesMailServerEndpoint is not configured")
      return
    }

    if (!this.config.technicalUser) {
      throw new Error("[MailService] Technical user credentials not configured")
    }

    // Get technical user token
    const token = await this.getTechnicalUserToken()

    // Prepare URL with query parameter
    const url = new URL(this.config.limesMailServerEndpoint)
    url.searchParams.set("from", "elektra")

    // Prepare request body
    const body = JSON.stringify({
      recipients: Array.isArray(params.recipients) ? params.recipients : [params.recipients],
      subject: params.subject,
      mime_type: "text/html",
      mail_text: params.bodyHtml,
    })

    // Send email via Limes API
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[MailService] Sending email to Limes:`)
        console.log(`  URL: ${url.toString()}`)
        console.log(
          `  Recipients: ${JSON.stringify(Array.isArray(params.recipients) ? params.recipients : [params.recipients])}`
        )
        console.log(`  Subject: ${params.subject}`)
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": token,
        },
        body,
      })

      if (!response.ok) {
        const responseBody = await response.text()
        console.error(`[MailService] Limes API error:`)
        console.error(`  Status: ${response.status} ${response.statusText}`)
        console.error(`  URL: ${url.toString()}`)
        console.error(`  Response: ${responseBody}`)
        throw new Error(`Email API failed (${response.status}): ${responseBody}`)
      }

      const responseData = await response.text()
      console.info(`[MailService] Email sent successfully: ${response.status} - ${responseData}`)
    } catch (error) {
      if (error instanceof Error) {
        // Network or fetch errors
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new Error(`Email API timeout: ${error.message}`)
        }
        if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
          throw new Error(`Email API connection error: ${error.message}`)
        }
      }
      throw error
    }
  }

  /**
   * Get or create a technical user session and return the auth token
   * Implements singleton pattern with promise deduplication to avoid race conditions
   */
  private async getTechnicalUserToken(): Promise<string> {
    // If we already have a valid session, return its token
    if (this.technicalUserSession?.isValid()) {
      const token = this.technicalUserSession.getToken()?.authToken
      if (token) {
        return token
      }
    }

    // If there's already a session creation in progress, wait for it
    if (this.sessionPromise) {
      const session = await this.sessionPromise
      const token = session.getToken()?.authToken
      if (!token) {
        throw new Error("[MailService] Failed to get token from technical user session")
      }
      return token
    }

    // Create a new session
    this.sessionPromise = this.createTechnicalUserSession()

    try {
      this.technicalUserSession = await this.sessionPromise
      const token = this.technicalUserSession.getToken()?.authToken
      if (!token) {
        throw new Error("[MailService] Failed to get token from technical user session")
      }
      return token
    } finally {
      // Clear the promise once resolved/rejected
      this.sessionPromise = undefined
    }
  }

  /**
   * Create a new OpenStack session for the technical user
   */
  private async createTechnicalUserSession(): Promise<Awaited<SignalOpenstackSessionType>> {
    if (!this.config.technicalUser) {
      throw new Error("[MailService] Technical user credentials not configured")
    }

    const normalizedEndpoint = this.config.identityEndpoint.endsWith("/")
      ? this.config.identityEndpoint
      : `${this.config.identityEndpoint}/`

    // Proxy is ONLY enabled in development mode for security reasons
    const proxyConfig =
      process.env.NODE_ENV !== "production" && this.config.proxyUrl ? { uri: this.config.proxyUrl } : undefined

    // Build authentication payload with cloud_admin project scope
    // The technical user is always scoped to cloud_admin/ccadmin for mail service
    const authPayload = {
      auth: {
        identity: {
          methods: ["password"] as const,
          password: {
            user: {
              name: this.config.technicalUser.name,
              password: this.config.technicalUser.password,
              domain: { name: this.config.technicalUser.domain },
            },
          },
        },
        scope: {
          project: {
            name: "cloud_admin",
            domain: { name: "ccadmin" },
          },
        },
      },
    }

    const session = await SignalOpenstackSession(normalizedEndpoint, authPayload as any, {
      interfaceName: this.config.defaultEndpointInterface || "public",
      debug: process.env.NODE_ENV !== "production",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      proxy: proxyConfig,
    })

    console.info("[MailService] Technical user session created successfully")
    return session
  }

  /**
   * Explicitly terminate the technical user session
   * Useful for cleanup or forcing session refresh
   */
  async terminateSession(): Promise<void> {
    if (this.technicalUserSession) {
      await this.technicalUserSession.terminate()
      this.technicalUserSession = undefined
      console.info("[MailService] Technical user session terminated")
    }
  }
}
