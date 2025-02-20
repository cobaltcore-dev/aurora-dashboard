import type { AuroraSignalSession } from "./session"
import type { ActionOptions, ActionBody } from "./client"
import * as client from "./client"
import { AuroraSignalError } from "./error"

export interface ServiceOptions {
  headers?: Record<string, string>
  debug?: boolean
  region?: string
  interfaceName?: string
}

export interface ServiceActionOptions extends ActionOptions, ServiceOptions {}

export const Service = (name: string, session: AuroraSignalSession, serviceOptions?: ServiceOptions) => {
  // this functions builds the client parameters based on the service options and the client options
  const clientParams = async (clientOptions: ActionOptions) => {
    const token = await session.getToken()

    if (token === undefined || token === null) throw new AuroraSignalError("No valid auth token available")

    const {
      interfaceName = "public",
      region,
      headers,
      debug,
    } = {
      ...serviceOptions,
      ...clientOptions,
    }

    const serviceURL = token.serviceURL(name, {
      interfaceName,
      region,
    })

    if (serviceURL === undefined || serviceURL === null) {
      throw new AuroraSignalError(`Service ${name} (region: ${region}, interface: ${interfaceName}) not found.`)
    }
    return {
      host: serviceURL,
      headers: { ...headers, "X-Auth-Token": token.authToken },
      debug,
    }
  }

  return {
    head: async (path: string, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.head(path, params)),

    get: async (path: string, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.get(path, params)),

    post: async (path: string, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.post(path, values, { ...params })),

    put: async (path: string, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.put(path, values, { ...params })),

    patch: async (path: string, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.patch(path, values, { ...params })),

    del: async (path: string, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.del(path, params)),
  }
}
