import path from "path"
import { createServer } from "@cobaltcore-dev/aurora/server"
import { initializeMailService } from "./routers/notification"
import { registerEmailEndpoint } from "./routes/email"

const rawPort = process.env.PORT ?? "4005"
if (!/^\d+$/.test(rawPort)) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}
const PORT = Number(rawPort)
if (PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}

// Initialize mail service (dashboard-specific feature)
initializeMailService({
  identityEndpoint: process.env.IDENTITY_ENDPOINT || "",
  limesMailServerEndpoint: process.env.LIMES_MAIL_SERVER_ENDPOINT,
  technicalUser:
    process.env.TECHNICAL_USER_NAME && process.env.TECHNICAL_USER_PASSWORD && process.env.TECHNICAL_USER_DOMAIN
      ? {
          name: process.env.TECHNICAL_USER_NAME,
          password: process.env.TECHNICAL_USER_PASSWORD,
          domain: process.env.TECHNICAL_USER_DOMAIN,
        }
      : undefined,
  defaultEndpointInterface: process.env.DEFAULT_ENDPOINT_INTERFACE,
  proxyUrl: process.env.GLOBAL_AGENT_HTTP_PROXY,
})

// Create Aurora server
createServer({
  viteRoot: path.resolve(__dirname, "../.."),
  identityEndpoint: process.env.IDENTITY_ENDPOINT,
  bffEndpoint: process.env.BFF_ENDPOINT,
  defaultEndpointInterface: process.env.DEFAULT_ENDPOINT_INTERFACE,
  proxyUrl: process.env.GLOBAL_AGENT_HTTP_PROXY,
  cephRegion: process.env.CEPH_REGION,
  imageMetadataExcludedProperties: process.env.IMAGE_METADATA_EXCLUDED_PROPERTIES,
  insecureCookies: process.env.INSECURE_COOKIES === "true",
})
  .then(async (server) => {
    // Register custom dashboard-specific endpoints
    const bffEndpoint = process.env.BFF_ENDPOINT
      ? "/" + process.env.BFF_ENDPOINT.split("/").filter(Boolean).join("/")
      : "/polaris-bff"

    registerEmailEndpoint(server, bffEndpoint)

    return server.listen({ host: "0.0.0.0", port: PORT })
  })
  .then((address) => console.log(`Server listening on ${address}`))
  .catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })
