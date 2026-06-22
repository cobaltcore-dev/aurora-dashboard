import path from "path"
import { createServer } from "@cobaltcore-dev/aurora/server"

const rawPort = process.env.PORT ?? "4005"
if (!/^\d+$/.test(rawPort)) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}
const PORT = Number(rawPort)
if (PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}

const isProduction = process.env.NODE_ENV === "production"
// In production the build copies src/policies → dist/policies.
// In development tsx runs from source so src/policies is used directly.
const policyDir = isProduction ? path.resolve(__dirname, "../../dist/policies") : path.resolve(__dirname, "../policies")

createServer({
  viteRoot: path.resolve(__dirname, "../.."),
  identityEndpoint: process.env.IDENTITY_ENDPOINT,
  bffEndpoint: process.env.BFF_ENDPOINT,
  defaultEndpointInterface: process.env.DEFAULT_ENDPOINT_INTERFACE,
  proxyUrl: process.env.GLOBAL_AGENT_HTTP_PROXY,
  cephRegion: process.env.CEPH_REGION,
  imageMetadataExcludedProperties: process.env.IMAGE_METADATA_EXCLUDED_PROPERTIES,
  cookieName: process.env.DASHBOARD_COOKIE_NAME || undefined,
  crossDomainCookie: process.env.ENABLE_CROSS_DASHBOARD_COOKIE
    ? process.env.ENABLE_CROSS_DASHBOARD_COOKIE.toLowerCase() === "true"
    : undefined,
  insecureCookies: process.env.INSECURE_COOKIES ? process.env.INSECURE_COOKIES.toLowerCase() === "true" : undefined,
  policyDir,
})
  .then((server) => server.listen({ host: "0.0.0.0", port: PORT }))
  .then((address) => console.log(`Server listening on ${address}`))
  .catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })
