import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "../server/routers/index"

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // @ts-ignore
      url: BFF_ENDPOINT, // Ensure this matches your backend's tRPC path
    }),
  ],
})

export default trpc
