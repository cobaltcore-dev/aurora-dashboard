# Server-Sent Events (SSE)

**What is SSE?**
Server-Sent Events allows servers to push real-time data to clients over HTTP. Unlike WebSockets, SSE is unidirectional (server → client only).

**TRPC Implementation**

Use `yield` for simple sequential data
like progress updates, iterations, use `ReadableStream` for complex streaming scenarios like external API.

```typescript
export const router = {
  subscribe: procedure.subscription(async function* () {
    yield { progress: 50 }
  }),
}
```

```typescript
export const router = {
  monitor: procedure.subscription(() => {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({ status: "Running" })
      },
    })
  }),
}
```
