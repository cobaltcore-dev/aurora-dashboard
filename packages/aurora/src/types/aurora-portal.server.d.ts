import type { FastifyInstance } from "fastify"

export interface AuroraServerConfig {
  bffEndpoint?: string
  viteRoot?: string
}

export declare function createServer(config?: AuroraServerConfig): Promise<FastifyInstance>
