---
"@cobaltcore-dev/aurora": minor
---

Add support for custom tRPC routers with full type safety

**New exports from `@cobaltcore-dev/aurora/server`:**
- `AuroraRouterWithCustom<T>` - Type helper to merge custom routers with base Aurora router

**New exports from `@cobaltcore-dev/aurora/client`:**
- `CreateTypedTrpcReact<T>` - Generic type for typed React tRPC client
- `CreateTypedTrpcClient<T>` - Generic type for typed vanilla tRPC client
- `TrpcReact` - Type alias for the React tRPC client

**Usage:**

1. Define custom routers using `auroraRouter` and `protectedProcedure`:
```typescript
import { auroraRouter, protectedProcedure } from "@cobaltcore-dev/aurora/server"

export const customRouters = auroraRouter({
  feedback: auroraRouter({
    submit: protectedProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => ({ success: true })),
  }),
})
```

2. Register with `createServer`:
```typescript
createServer({ routers: [customRouters], ... })
```

3. Create typed client exports:
```typescript
import type { AuroraRouterWithCustom } from "@cobaltcore-dev/aurora/server"
import { trpcReact, CreateTypedTrpcReact } from "@cobaltcore-dev/aurora/client"

type AppRouter = AuroraRouterWithCustom<typeof customRouters>
export const trpc = trpcReact as unknown as CreateTypedTrpcReact<AppRouter>
```

4. Use with full type safety:
```typescript
const mutation = trpc.feedback.submit.useMutation() // ✅ Type-safe!
```
