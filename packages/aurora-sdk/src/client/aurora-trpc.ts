import { createTRPCClient } from "@trpc/client"
import { httpBatchLink, HTTPHeaders } from "@trpc/client"
import { AnyTRPCRouter } from "@trpc/server"

/**
 * This function creates a tRPC client for Aurora
 * It uses the httpBatchLink to connect to the backend server
 * @param url of the backend server (BFF)
 * @returns trpc client
 */
export function createAuroraTRPCClient<ConcreteRouter extends AnyTRPCRouter>(
  url: string,
  options?: {
    headers?: HTTPHeaders | (() => HTTPHeaders | Promise<HTTPHeaders>)
  }
) {
  const batchLink = httpBatchLink({
    url,
    headers: options?.headers || undefined,
  })

  return createTRPCClient<ConcreteRouter>({
    links: [batchLink],
  })
}
