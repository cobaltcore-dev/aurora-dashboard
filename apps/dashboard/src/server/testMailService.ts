#!/usr/bin/env tsx
/**
 * Standalone test script for the mail service (dashboard-only implementation)
 *
 * Usage:
 *   1. Set up your .env file with mail service configuration
 *   2. Run: pnpm test:mail <recipient-email>
 */

import { MailService } from "./services/mailService"

async function testMailService() {
  console.log("🧪 Testing Mail Service (Dashboard Implementation)\n")

  // Check environment variables
  const requiredVars = [
    "IDENTITY_ENDPOINT",
    "LIMES_MAIL_SERVER_ENDPOINT",
    "TECHNICAL_USER_NAME",
    "TECHNICAL_USER_PASSWORD",
    "TECHNICAL_USER_DOMAIN",
  ]

  const missing = requiredVars.filter((v) => !process.env[v])
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:")
    missing.forEach((v) => console.error(`   - ${v}`))
    console.error("\nPlease set them in your .env file or environment.\n")
    process.exit(1)
  }

  console.log("✅ Environment variables loaded:")
  console.log(`   IDENTITY_ENDPOINT: ${process.env.IDENTITY_ENDPOINT}`)
  console.log(`   LIMES_MAIL_SERVER_ENDPOINT: ${process.env.LIMES_MAIL_SERVER_ENDPOINT}`)
  console.log(`   TECHNICAL_USER_NAME: ${process.env.TECHNICAL_USER_NAME}`)
  console.log(`   TECHNICAL_USER_PASSWORD: ${process.env.TECHNICAL_USER_PASSWORD ? "[SET - length: " + process.env.TECHNICAL_USER_PASSWORD.length + "]" : "[NOT SET]"}`)
  console.log(`   TECHNICAL_USER_DOMAIN: ${process.env.TECHNICAL_USER_DOMAIN}`)
  console.log(`   Project scope: cloud_admin/ccadmin (hardcoded)\n`)

  // Create mail service instance
  const mailService = new MailService({
    identityEndpoint: process.env.IDENTITY_ENDPOINT!,
    limesMailServerEndpoint: process.env.LIMES_MAIL_SERVER_ENDPOINT,
    technicalUser: {
      name: process.env.TECHNICAL_USER_NAME!,
      password: process.env.TECHNICAL_USER_PASSWORD!,
      domain: process.env.TECHNICAL_USER_DOMAIN!,
    },
    proxyUrl: process.env.GLOBAL_AGENT_HTTP_PROXY,
  })

  console.log("📧 Attempting to send test email...\n")

  try {
    // Get recipient from command line argument or use a default
    const recipient = process.argv[2] || "test@example.com"

    await mailService.sendEmail({
      recipients: recipient,
      subject: "Test Email from Aurora Dashboard (Dashboard-Only Implementation)",
      bodyHtml: `
        <html>
          <body>
            <h1>Test Email</h1>
            <p>This is a test email sent from the Aurora dashboard's custom mail service.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <hr>
            <p style="color: gray; font-size: 12px;">
              Sent via technical user: ${process.env.TECHNICAL_USER_NAME}@${process.env.TECHNICAL_USER_DOMAIN}<br>
              Implementation: Dashboard-only (not part of Aurora core)
            </p>
          </body>
        </html>
      `,
    })

    console.log("✅ Email sent successfully!\n")
    console.log(`📬 Recipient: ${recipient}`)
    console.log("💡 Check the recipient's inbox to verify delivery.\n")
  } catch (error) {
    console.error("❌ Failed to send email:\n")
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`)
      console.error(`   Stack: ${error.stack}\n`)
    } else {
      console.error(error)
    }
    process.exit(1)
  } finally {
    // Clean up
    await mailService.terminateSession()
    console.log("🧹 Session terminated\n")
  }
}

// Run the test
testMailService()
