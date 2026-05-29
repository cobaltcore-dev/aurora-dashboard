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
  .then((server) => server.listen({ host: "0.0.0.0", port: PORT }))
  .then((address) => console.log(`Server listening on ${address}`))
  .catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })
