# Dashboard Mail Service

Custom email notification service for SAP Converged Cloud Aurora Dashboard using Limes mail server.

## Overview

This is a **dashboard-specific** implementation that extends Aurora with email capabilities. It's implemented entirely in `apps/dashboard` and does not modify the open-source Aurora core package.

## Architecture

- **Location**: `apps/dashboard/src/server/services/mailService.ts`
- **Router**: Custom HTTP endpoint at `POST /polaris-bff/send-email`
- **Authentication**: Uses technical user (service account) with OpenStack Keystone
- **Mail Server**: Limes mail API (SAP internal)

## Configuration

### Environment Variables

Add these to `apps/dashboard/.env`:

```bash
# Required for mail service
LIMES_MAIL_SERVER_ENDPOINT="https://limes-campfire.qa-de-1.cloud.sap/v1/send-email"
TECHNICAL_USER_NAME="dashboard"
TECHNICAL_USER_PASSWORD="your-password"
TECHNICAL_USER_DOMAIN="default"
```

**Note:** The technical user is automatically scoped to `cloud_admin` project in the `ccadmin` domain (hardcoded in the mail service).

## Testing

### Standalone Test (No Server Required)

```bash
cd apps/dashboard
pnpm test:mail your-email@example.com
```

### Via API (Server Running)

```bash
# 1. Start server
pnpm dev

# 2. Send email via HTTP
curl -X POST http://localhost:4005/polaris-bff/send-email \
  -H "Content-Type: application/json" \
  -b "dashboard-session-auth=YOUR_SESSION_COOKIE" \
  -d '{
    "recipients": "test@example.com",
    "subject": "Test Email",
    "bodyHtml": "<h1>Hello!</h1>"
  }'
```

## API Reference

### POST /polaris-bff/send-email

Sends an email via Limes mail server.

**Authentication**: Requires valid session cookie (`dashboard-session-auth`)

**Request Body**:

```typescript
{
  recipients: string | string[]  // Email address(es)
  subject: string                // Email subject
  bodyHtml: string              // HTML email body
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

**Error Responses**:

- `401 Unauthorized` - Missing or invalid session
- `400 Bad Request` - Invalid request body
- `408 Request Timeout` - Limes API timeout
- `500 Internal Server Error` - Mail service not configured or other errors
- `503 Service Unavailable` - Cannot connect to Limes

## Implementation Details

### Technical User Authentication

The mail service creates a separate OpenStack session using technical user credentials:

1. **User Authentication**: Technical user (e.g., `dashboard`) in specified domain (e.g., `default`)
2. **Project Scoping**: Always scoped to `cloud_admin` project in `ccadmin` domain (hardcoded)
3. **Token Management**: Token is cached and reused across requests
4. **Session Lifecycle**: Singleton pattern with promise deduplication

### Security

- ✅ Technical user credentials stored in environment variables
- ✅ Separate session from user sessions
- ✅ Session cookie validation for API access
- ✅ Proxy only enabled in development mode
- ✅ Token auto-refresh when expired

### Limes Integration

The `from` parameter is set to `elektra` for compatibility with existing Limes policies:

```typescript
url.searchParams.set("from", "elektra")
```

This ensures the mail service has the same permissions as Elektra.

## Files

```
apps/dashboard/src/server/
├── services/
│   └── mailService.ts          # Core mail service implementation
├── routers/
│   └── notification.ts         # Mail service initialization & helpers
├── server.ts                   # Server setup with custom /send-email endpoint
└── testMailService.ts          # Standalone test script
```

## Comparison with Elektra

| Feature            | Elektra (Ruby)                          | Aurora Dashboard (TypeScript) |
| ------------------ | --------------------------------------- | ----------------------------- |
| Implementation     | Rails mailer                            | Custom Fastify endpoint       |
| HTTP Client        | Net::HTTP                               | fetch (Node.js)               |
| Token Source       | ApiClientManager.cloud_admin_api_client | SignalOpenstackSession        |
| Error Handling     | Rails exceptions                        | HTTP status codes             |
| Session Management | Per-request                             | Singleton with caching        |
| Configuration      | Rails.configuration + ENV               | Environment variables only    |
| Integration        | Core Rails app                          | Dashboard-specific extension  |

## Troubleshooting

### "Mail service is not configured"

All required environment variables must be set:

- `LIMES_MAIL_SERVER_ENDPOINT`
- `TECHNICAL_USER_NAME`
- `TECHNICAL_USER_PASSWORD`
- `TECHNICAL_USER_DOMAIN`

### "401 Unauthorized" from Keystone

- Check technical user credentials
- Verify user exists in the specified domain
- Ensure user has access to the `cloud_admin` project in the `ccadmin` domain

### "403 Forbidden" from Limes

- Verify `from` parameter is set to `elektra`
- Check technical user has Limes permissions
- Ensure token is project-scoped

### Email not delivered

- Check Limes server logs
- Verify recipient email format
- Check spam folder

## Why Dashboard-Only?

This implementation is specific to SAP's infrastructure (Limes, technical users, specific domains/projects). Keeping it in `apps/dashboard` means:

- ✅ Aurora core remains generic and open-source
- ✅ SAP-specific logic is isolated
- ✅ Easier to maintain and customize
- ✅ No need to generalize for other use cases
- ✅ Project scoping (`cloud_admin/ccadmin`) is hardcoded where it belongs
