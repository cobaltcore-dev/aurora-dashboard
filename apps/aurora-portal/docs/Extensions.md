# Aurora Extensions

## What is an Aurora Extension?

To address this question, let's first clarify the architecture of Aurora. Aurora consists of two main parts:

1. **Frontend**: The UI elements that run in the browser.
2. **Backend (BFF)**: The backend services that abstract APIs and offer optimized access for the frontend.

Aurora Extensions can provide both parts or just one of them. However, it's important to note that both parts must follow a specific interface. The development of an extension begins with bootstrapping the **Aurora Extension Template**. This template already includes all necessary configurations and file structures. Here are some important details to consider during extension development:

1. **Package.json Exports**:

   - The frontend part (UI) should be exported under `./client`.
   - The backend part should be exported under `./server`.
   - If only one part is relevant, the other part can be omitted.

2. **Use the aurora-sdk**: This library provides essential functions for both BFF and Frontend. It also ensures that both Aurora and Extensions use the same versions of **TRPC**.

3. **TRPC-Based Communication**: Aurora uses **TRPC** to manage communication between the frontend and BFF. The extension must follow TRPC rules and properly define routers for both parts. Also, the frontend uses a specific client to interact with the backend.

---

## Backend

The backend part of an Aurora Extension handles the logic and data processing. It interacts with the frontend via APIs and ensures that the necessary business logic is executed correctly. Extensions can provide custom routes, handle authentication, and interact with databases or external services.

### Interface

The extension must export a module under `./server` (as defined in **package.json**) that includes a `registerRouter` method.

- **`registerRouter: () => { appRouter: AnyTRPCRouter }`**

**Example:**

```ts
export const registerRouter = () => ({
  appRouter, // Root router of the extension that contains all sub-routers
})
```

### Usage

Use functions provided by aurora-sdk to define and handle the routers.

The `auroraProvider` object is created by calling the `getAuroraProvider` function. It provides several utility methods for interacting with the Aurora backend. Below are the key methods that are available:

- `getAuroraRouter`: This method returns the `AuroraRouter`, which is used to define API routes for the extension.
- `getAuroraMergeRouters`: This method is used to merge multiple routers into a single router, which allows organizing and managing different route handlers more efficiently.
- `getAuroraPublicProcedure`: This method returns a function to define **public** procedures (queries or mutations) that do not require authentication.
- `getAuroraProtectedProcedure`: This method returns a function to define **protected** procedures (queries or mutations) that require authentication.

#### Example Code

Import aurora-sdk and create router functions:

```ts
import { getAuroraProvider } from "@cobaltcore-dev/aurora-sdk/server"

const auroraProvider = getAuroraProvider()

export const auroraRouter = auroraProvider.getAuroraRouter
export const mergeRouters = auroraProvider.getAuroraMergeRouters
export const publicProcedure = auroraProvider.getAuroraPublicProcedure
export const protectedProcedure = auroraProvider.getAuroraProtectedProcedure
```

- **auroraRouter**: Used to create a router based on the given configuration.
- **mergeRouters**: Combines multiple routers into a single router at the same level.
- **publicProcedure**: Defines queries or mutations that do not require authentication, making them accessible to all users.
- **protectedProcedure**: Defines queries or mutations that require authentication. It provides the following context:
  - **authToken**: A string representing the bearer token.
  - **token**: An object containing the token (catalog, roles, user, scope)

**Example of an Entity Router:**

```ts
export const entityRouter = {
  entities: auroraRouter({
    get: publicProcedure.input().query(): Entity => {
      return { id: input.id, name: "Mars 1" }
    }),

    list: protectedProcedure.query(async ({ ctx }): Promise<Entity[]> => {
      const { authToken, token } = await ctx.validateSession()
      return [
        { id: -1, name: JSON.stringify(token, null, 2) },
        { id: 0, name: JSON.stringify(authToken, null, 2) },
        { id: 1, name: "Mars 1" },
        { id: 2, name: "Mars 2" },
        { id: 3, name: "Mars 3" },
        { id: 4, name: "Mars 4" },
        { id: 5, name: "Mars 5" },
      ]
    }),
  }),
}
```

### Frontend

The frontend part of the Aurora Extension is responsible for the user interface (UI) components and their interaction with the backend. It defines how the extension’s UI appears and behaves, and how it communicates with the backend to fetch and display data.

**Important**: Please **do not** bundle `React` and `ReactDOM` in your extension build. These libraries are already included in the Aurora platform and bundling them again can lead to conflicts.

### Interface

The frontend extension follows a specific interface defined by the `registerClient` function. This function is essential for integrating the frontend with Aurora, and it must return at least the `App` component, which is required. Optionally, you can also return the `Logo` component to be used in the navigation bar.

This interface is foundational and may evolve in future releases. Any changes will be documented in the Release Notes.

- **`registerClient: () => { App: ReactNode, Logo: ReactNode }`**

```ts
export const registerClient = () => ({
  App: App, // Required: The main app component
  Logo: Logo, // Optional: Add a logo for the navigation bar
})
```

### Usage

To enable communication between your frontend and the backend, you need to create a TRPC client. This is done by importing and using the provided createAuroraTRPCClient function.

Here’s how to set it up:

```ts
import type { AppRouter } from "../server/routers"
import { createAuroraTRPCClient } from "@cobaltcore-dev/aurora-sdk/client"

export const trpcClient = createAuroraTRPCClient<AppRouter>("/polaris-bff")
```

Once you’ve set up the trpcClient, you can use it throughout your frontend to make API calls to the backend. This ensures seamless communication between your frontend and the backend, making it easy to fetch and manipulate data.

### Dev Environment

For enhanced Developer Experience (DX), Aurora provides a special function that creates a development context and session.

- **`createAuroraTRPCClient: (options: object) => Context`**

Options:

- **endpointUrl:** endpoint URL of the keystone api
- **domain** user domain, e.g. `"Default"`
- **user:** user name
- **password:**
- **scope:** a scope containing a domain and/or project

**Example for a scope:**

```json
{
  "domain": {
    "name": "Default"
  }
}
```

Or

```json
{
  "project": {
    "id": "123456789"
  }
}
```

Or

```json
{
  "project": {
    "name": "test",
    "domain": {
      "name": "Default"
    }
  }
}
```

**Example:**

```ts
import Fastify from "fastify"
import {
  auroraFastifyTRPCPlugin,
  AuroraFastifyTRPCPluginOptions,
  createAuroraOpenstackDevContext,
} from "@cobaltcore-dev/aurora-sdk/server"
import { registerRouter, AppRouter } from "./routers" // tRPC router
import * as dotenv from "dotenv"

dotenv.config()

const PORT = process.env.PORT || "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

const { appRouter } = registerRouter()

const server = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

async function startServer() {
  const createContext = await createAuroraOpenstackDevContext({
    endpointUrl: process.env.OS_AUTH_URL || "http://localhost:8080/identity/v3/",
    domain: process.env.OS_DOMAIN_NAME || "Default",
    user: process.env.OS_USERNAME || "admin",
    password: process.env.OS_PASSWORD || "password",
  })

  // Register the tRPC plugin to handle API routes for the application
  await server.register(auroraFastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
      createContext, // Create a context for the tRPC router
    } satisfies AuroraFastifyTRPCPluginOptions<AppRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
```

---

By following these guidelines, you can easily develop extensions that integrate seamlessly with Aurora, ensuring consistency and functionality across both the frontend and backend parts.

This Markdown will render as a fully formatted document with headers, code blocks, and lists when viewed in a Markdown viewer.
