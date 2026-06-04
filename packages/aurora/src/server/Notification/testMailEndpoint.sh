#!/bin/bash
# Test script for Aurora Mail Service via tRPC endpoint
#
# Usage:
#   1. Start the Aurora dashboard server: pnpm dev
#   2. Login to get a session cookie
#   3. Run this script: ./testMailEndpoint.sh your-email@example.com

set -e

RECIPIENT="${1:-test@example.com}"
BASE_URL="${BASE_URL:-http://localhost:4005}"
BFF_ENDPOINT="${BFF_ENDPOINT:-/polaris-bff}"

echo "🧪 Testing Aurora Mail Service Endpoint"
echo ""
echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  BFF Endpoint: $BFF_ENDPOINT"
echo "  Recipient: $RECIPIENT"
echo ""

# Check if server is running
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|302\|304"; then
  echo "❌ Server not reachable at $BASE_URL"
  echo "   Please start the server with: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test the sendEmail endpoint
echo "📧 Sending test email via tRPC..."
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL$BFF_ENDPOINT/sendEmail" \
  -H "Content-Type: application/json" \
  -b "dashboard-session-auth=your-session-cookie-here" \
  -d "{
    \"recipients\": \"$RECIPIENT\",
    \"subject\": \"Test Email from Aurora\",
    \"bodyHtml\": \"<html><body><h1>Hello!</h1><p>This is a test email sent at $(date)</p></body></html>\"
  }")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Email sent successfully!"
  echo "📬 Check $RECIPIENT inbox"
elif echo "$RESPONSE" | grep -q "UNAUTHORIZED"; then
  echo "❌ Unauthorized - you need to login first"
  echo "   1. Open $BASE_URL in your browser"
  echo "   2. Login with your credentials"
  echo "   3. Get the 'dashboard-session-auth' cookie from DevTools"
  echo "   4. Update the cookie in this script"
elif echo "$RESPONSE" | grep -q "Mail service is not configured"; then
  echo "❌ Mail service is not configured"
  echo "   Add these to your .env file:"
  echo "   LIMES_MAIL_SERVER_ENDPOINT=https://email.example.com/v1/email"
  echo "   TECHNICAL_USER_NAME=aurora-mailer"
  echo "   TECHNICAL_USER_PASSWORD=your-password"
  echo "   TECHNICAL_USER_DOMAIN=ccadmin"
  echo "   TECHNICAL_USER_PROJECT=cloud_admin"
else
  echo "❌ Failed to send email"
  echo "   Check the response above for details"
fi
