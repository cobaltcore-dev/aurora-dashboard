# Request Cancellation via AbortSignal

This document describes how request cancellation is implemented across the Aurora Portal BFF stack — from the browser client through tRPC and Fastify down to the OpenStack Swift API.

---

## Overview

When a user cancels an in-flight operation (e.g. clicking "Cancel upload" or closing a modal), the cancellation propagates through the following chain:

```text
Browser (AbortController.abort())
  → HTTP connection closed (fetch cancelled)
    → Fastify: res.raw / req.raw "close" event
      → ctx.req.signal aborted
        → tRPC procedure receives aborted signal
          → signal-openstack service.put/get/del({ signal })
            → native fetch() to OpenStack API aborted
```

---

## Implementation

### 1. Fastify context (`context.ts`)

An `AbortController` is created per request and tied to the HTTP connection lifecycle. Two listeners cover all procedure types:

- **`res.raw "close"`** — fires when the client disconnects after the request body has been fully read (queries, JSON mutations)
- **`req.raw "close"`** — fires when the client disconnects while the request body is still being streamed (octet-stream uploads)
- **`req.raw "error"`** — suppresses unhandled `ECONNRESET` crashes when TCP is reset mid-upload

```typescript
const abortController = new AbortController()
const abort = () => abortController.abort()

opts.res.raw.on("close", () => {
  if (!opts.res.raw.writableEnded) abort()
})

opts.req.raw.on("close", () => {
  if (!opts.req.raw.complete) abort()
})

opts.req.raw.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "ECONNRESET" || err.code === "ECONNABORTED") abort()
})

// Exposed on the request object and returned as ctx.signal
Object.defineProperty(opts.req, "signal", { value: abortController.signal, writable: false })
```

> **Why two listeners?**
> For queries and JSON mutations, `req.complete` is `true` immediately — the request body is fully read before the procedure starts. The `res.raw` listener is the only reliable signal in that case. For streaming uploads, the response hasn't started yet when the client aborts, so `req.raw` fires first.

---

### 2. tRPC middleware (`trpc.ts`)

`signal` is explicitly forwarded through `projectScopedProcedure` and `domainScopedProcedure` so it remains accessible after rescoping:

```typescript
return next({
  ctx: {
    ...ctx,
    openstack: openstackSession,
    signal: ctx.signal,
  },
})
```

---

### 3. signal-openstack service layer (`service.ts`)

`ServiceActionOptions` accepts an optional `AbortSignal` which is forwarded to the underlying `fetch()` call:

```typescript
export interface ServiceActionOptions extends SignalOpenstackOptions {
  queryParams?: Record<string, string | number | boolean | string[]>
  signal?: AbortSignal
}
```

The signal flows: `ServiceActionOptions` → `clientParams()` → `ActionOptions` → `fetch({ signal })`.

---

## Usage Patterns

### Pattern 1 — via `service` (primary pattern in swiftRouter)

Pass `ctx.req.signal` as the last options argument. This is the recommended approach for all Swift API calls.

```typescript
const swift = ctx.openstack?.service("swift")

// GET
const response = await swift.get("/containers", { signal: ctx.req.signal })

// PUT (upload)
await swift.put(`${container}/${object}`, body, {
  headers: { "Content-Type": "application/octet-stream" },
  signal: ctx.req.signal,
})

// DELETE
await swift.del(`${container}/${object}`, { signal: ctx.req.signal })
```

When the client disconnects, `ctx.req.signal` is aborted → `fetch()` throws `AbortError` → signal-openstack re-throws as `SignalOpenstackError("Request canceled")`.

---

### Pattern 2 — via `cancellable*` methods (manual BFF-side cancel)

Use when you need to cancel a request from BFF logic independently of the client connection — for example, a timeout or race condition.

```typescript
const swift = ctx.openstack?.service("swift")

const upload = swift.cancellablePut(url, body, { headers })

// Cancel after 30 seconds regardless of client state
const timeout = setTimeout(() => upload.cancel(), 30_000)

try {
  const response = await upload.promise
  return await processResponse(response)
} catch (error) {
  if (error.message === "Request canceled") {
    throw new TRPCError({ code: "TIMEOUT", message: "Upload timed out" })
  }
  throw error
} finally {
  clearTimeout(timeout)
}
```

---

### Pattern 3 — via session directly (identity service, admin ops)

```typescript
const identityService = ctx.openstack?.service("identity")

const response = await identityService.get("auth/domains", {
  headers: { Accept: "application/json" },
  signal: ctx.req.signal,
})
```

---

## Testing Cancellation

### Test procedure: `testCancellation` (query)

Verifies that `ctx.req.signal` aborts an in-flight `fetch()` for query-type procedures. The procedure waits up to 10 seconds for an external HTTP response — closing the client connection before that should abort the fetch immediately.

```typescript
testCancellation: publicProcedure.query(async ({ ctx }) => {
  console.log("[testCancellation] req.complete:", ctx.req.raw.complete)
  console.log("[testCancellation] signal.aborted:", ctx.req.signal.aborted)

  ctx.req.signal.addEventListener("abort", () => {
    console.log("[testCancellation] signal aborted!")
  })

  console.log("[testCancellation] starting fetch...")

  const response = await fetch("https://httpbin.org/delay/10", {
    signal: ctx.req.signal,
  })

  console.log("[testCancellation] fetch completed:", response.status)
  return { ok: true, status: response.status }
})
```

**Frontend trigger** (e.g. on modal open/close):

```typescript
useEffect(() => {
  if (!isOpen) return
  const controller = new AbortController()

  trpcClient.testCancellation
    .query(undefined, { signal: controller.signal })
    .then(() => console.log("[testCancellation] completed"))
    .catch((err) => console.log("[testCancellation] aborted:", err.message))

  return () => {
    console.log("[testCancellation] aborting...")
    controller.abort()
  }
}, [isOpen])
```

**Expected server logs on cancel:**

```text
[testCancellation] req.complete: true
[testCancellation] signal.aborted: false
[testCancellation] starting fetch...
[testCancellation] signal aborted!
```

`fetch completed` should NOT appear — the fetch was aborted before the 10 s response.

---

### Test procedure: `testCancellationStream` (mutation)

Verifies cancellation for streaming mutations (octet-stream uploads). The procedure sends a slow 1 MB stream to a delayed endpoint — cancelling should interrupt the stream and abort the fetch.

```typescript
testCancellationStream: publicProcedure.mutation(async ({ ctx }) => {
  console.log("[testCancellationStream] starting fetch...")

  const response = await fetch("https://httpbin.org/delay/30", {
    method: "POST",
    signal: ctx.req.signal,
    body: new ReadableStream({
      async start(controller) {
        const chunk = new Uint8Array(1024).fill(65) // 1 KB of "A"
        for (let i = 0; i < 1000; i++) {
          if (ctx.req.signal.aborted) break
          controller.enqueue(chunk)
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
        controller.close()
      },
    }),
    // @ts-expect-error — duplex required for streaming request body
    duplex: "half",
  })

  console.log("[testCancellationStream] fetch completed:", response.status)
  return { ok: true, status: response.status }
})
```

**Frontend trigger:**

```typescript
useEffect(() => {
  if (!isOpen) return
  const controller = new AbortController()

  trpcClient.testCancellationStream
    .mutate(undefined, { signal: controller.signal })
    .then(() => console.log("[testCancellationStream] completed"))
    .catch((err) => console.log("[testCancellationStream] aborted:", err.message))

  return () => {
    console.log("[testCancellationStream] aborting...")
    controller.abort()
  }
}, [isOpen])
```

**Expected:** `fetch completed` should NOT appear after cancelling.

---

## Upload cancellation (`uploadObject`)

The full cancellation flow for file uploads:

### Frontend (`UploadObjectModal.tsx`)

An `AbortController` is created per upload attempt and its `signal` is passed to `trpcClient.mutate`. When the user clicks "Cancel upload", `controller.abort()` is called — this closes the HTTP connection to the BFF.

```typescript
const controller = new AbortController()
abortControllerRef.current = controller

await trpcClient.storage.swift.uploadObject.mutate(selectedFile, {
  context: uploadContext,
  signal: controller.signal,
})
```

On abort, the catch block detects the error and calls `onCancelled`:

```typescript
catch (err) {
  const isAborted =
    err instanceof Error &&
    (err.name === "AbortError" ||
      err.message === "Request canceled" ||
      err.message.includes("signal is aborted") ||
      err.message.includes("aborted"))

  if (isAborted) {
    setIsPending(false)
    setUploadId(null)
    onCancelled?.(submittedNameRef.current)
    handleClose()
    return
  }
  // ...
}
```

### BFF (`swiftRouter.ts` — `uploadObject`)

The incoming `ReadableStream` from `octetInputParser` is wrapped in a cancellable Web `ReadableStream` tied to `ctx.req.signal`. Each `pull()` checks the signal before reading the next chunk:

```typescript
const signal = ctx.req.signal
const reader = Readable.toWeb(trackedStream).getReader()

const webStream = new ReadableStream({
  async pull(streamController) {
    if (signal.aborted) {
      streamController.close()
      reader.cancel()
      return
    }
    const { done, value } = await reader.read()
    if (done || signal.aborted) {
      streamController.close()
      reader.cancel()
    } else {
      streamController.enqueue(value)
    }
  },
  cancel() {
    reader.cancel()
  },
})

await swift.put(url, webStream, {
  headers: { "Content-Type": contentType },
  signal: ctx.req.signal, // also passed to signal-openstack fetch()
})
```

Node.js stream error handlers suppress abort-related errors and propagate real failures via `destroy()`:

```typescript
const isAbortLike = (err: unknown) => {
  const code = (err as NodeJS.ErrnoException | undefined)?.code
  return code === "ECONNRESET" || code === "ECONNABORTED" || ctx.req.signal.aborted
}

validatedFile.on("error", (err) => {
  if (isAbortLike(err)) return
  progressTracker.destroy(err as Error)
})

progressTracker.on("error", (err) => {
  if (isAbortLike(err)) return
  trackedStream.destroy(err as Error)
})
```

### Full call chain on cancel

```text
user clicks "Cancel upload"
  → abortControllerRef.current.abort()
    → controller.signal aborted
      → trpcClient fetch() to BFF closed
        → Fastify req.raw "close" fires (req.complete = false)
          → abortController.abort() in context.ts
            → ctx.req.signal aborted
              → cancellable ReadableStream pull() returns early
                → swift.put() receives AbortError from signal-openstack
                  → SignalOpenstackError("Request canceled") thrown
                    → catch block in uploadObject procedure
                      → toast notification shown to user
```

---

## When to use each approach

| Scenario                          | Solution                                                              |
| --------------------------------- | --------------------------------------------------------------------- |
| User clicks Cancel in UI          | `AbortController` on frontend + `signal: controller.signal` in mutate |
| User closes tab / network drop    | `ctx.req.signal` — aborted automatically via `res.raw "close"`        |
| BFF-side timeout                  | `cancellable*` methods + `setTimeout`                                 |
| Cancelling parallel requests      | `cancellable*` methods with manual `cancel()`                         |
| Any Swift API call in a procedure | `{ signal: ctx.req.signal }` in every `swift.get/put/del/post/head`   |
