import type { AppRouter } from "../bff/routers"

import { createTRPCClient, httpBatchLink } from "@trpc/client"

//     👆 **type-only** import

// Pass AppRouter as generic here. 👇 This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/_bff",
    }),
  ],
})
