import { createTRPCClient } from "@trpc/client"
import { httpBatchLink } from "@trpc/client"
import { AnyTRPCRouter } from "@trpc/server"

/**
 * This function creates a tRPC client for Aurora
 * It uses the httpBatchLink to connect to the backend server
 * @param url of the backend server (BFF)
 * @returns trpc client
 */
export function createAuroraTRPCClient<ConcreteRouter extends AnyTRPCRouter>(url: string) {
  const links = httpBatchLink({ url })
  return createTRPCClient<ConcreteRouter>({
    links: [links],
  })
}
