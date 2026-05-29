import * as dotenv from "dotenv"
import { createServer } from "./server"

dotenv.config()

const rawPort = process.env.PORT ?? "4005"
if (!/^\d+$/.test(rawPort)) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}
const PORT = Number(rawPort)
if (PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${rawPort}`)
}

createServer()
  .then((server) => server.listen({ host: "0.0.0.0", port: PORT }))
  .then((address) => console.log(`Server listening on ${address}`))
  .catch((error) => {
    console.error("Failed to start server:", error)
    process.exit(1)
  })
