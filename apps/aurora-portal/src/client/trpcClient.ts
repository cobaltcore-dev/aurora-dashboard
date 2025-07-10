import {
  createTRPCClient,
  httpBatchLink,
  loggerLink,
  splitLink,
  unstable_httpSubscriptionLink as httpSubscriptionLink,
} from "@trpc/client"

import type { AuroraRouter } from "../server/routers"

declare const BFF_ENDPOINT: string

export const trpcClient = createTRPCClient<AuroraRouter>({
  links: [
    loggerLink(),
    splitLink({
      // Use httpSubscriptionLink for subscriptions
      condition: (op) => op.type === "subscription",
      true: httpSubscriptionLink({
        url: BFF_ENDPOINT,
        async headers() {
          const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
          return {
            "x-csrf-token": csrfToken,
          }
        },
      }),
      false: httpBatchLink({
        url: BFF_ENDPOINT,
        async headers() {
          const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
          return {
            "x-csrf-token": csrfToken,
          }
        },
      }),
    }),
  ],
})

export type TrpcClient = typeof trpcClient
