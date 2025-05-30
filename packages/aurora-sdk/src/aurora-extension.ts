// interface.ts
import type { IncomingMessage, ServerResponse } from "node:http"

/**
 * ServerConfig interface defines the configuration for the server.
 * It includes the mountPath where the server will be mounted and an optional context.
 */
export interface ServerConfig {
  mountRoute: string // API path to mount at
}

/**
 * The AppProps interface defines the properties that can be passed to the app.
 * It includes the path to the backend-for-frontend (BFF).
 * The BFF path is the endpoint for the backend-for-frontend service.
 */
export interface ServerAPI<Context> {
  handleRequest: (req: IncomingMessage, res: ServerResponse, context?: Context) => void
  path: string
}

/**
 * The ClientConfig interface defines the configuration for the client.
 * It includes the mountRoute where the client app will be mounted and an optional BFF path.
 * The BFF path is the endpoint for the backend-for-frontend service.
 */
export interface ClientConfig {
  mountRoute: string // Route to mount the client app
}

export interface ClientAPI<AppProps> {
  mount: (container: HTMLElement, props?: AppProps) => void
  unmount: (container: HTMLElement) => void
}

export type RegisterServerFunction<Context> = (config?: ServerConfig) => ServerAPI<Context>
export type RegisterClientFunction<AppProps> = (config?: ClientConfig) => ClientAPI<AppProps>

/**
 * The Extension interface defines the structure of an extension.
 * It includes the name, description, and version of the extension.
 * It also includes optional methods for registering server and client components.
 */
export interface Extension<Context, AppProps> {
  name: string
  description: string
  version: string

  // Server-side interface
  registerServer?: (config?: ServerConfig) => Promise<ServerAPI<Context>>

  // Client-side interface
  registerClient?: (config?: ClientConfig) => Promise<ClientAPI<AppProps>>
}
