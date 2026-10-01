import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { barbicanFetch, type BarbicanConfig } from "./barbican.js"

const config: BarbicanConfig = {
  endpoint: process.env.BARBICAN_ENDPOINT ?? "",
  token: process.env.OS_TOKEN ?? "",
  projectId: process.env.OS_PROJECT_ID ?? "",
}

if (!config.endpoint || !config.token || !config.projectId) {
  throw new Error("Missing required env vars: BARBICAN_ENDPOINT, OS_TOKEN, OS_PROJECT_ID")
}

const server = new McpServer({ name: "key-manager", version: "0.1.0" })

const paginationSchema = {
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(20),
}

server.tool("list_secrets", "List Key Manager secrets in the project", paginationSchema, async ({ offset, limit }) => {
  const data = await barbicanFetch(config, "/secrets", { offset, limit })
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
})

server.tool(
  "list_containers",
  "List Key Manager containers in the project",
  paginationSchema,
  async ({ offset, limit }) => {
    const data = await barbicanFetch(config, "/containers", { offset, limit })
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool("list_orders", "List Key Manager orders in the project", paginationSchema, async ({ offset, limit }) => {
  const data = await barbicanFetch(config, "/orders", { offset, limit })
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
