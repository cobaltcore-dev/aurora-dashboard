import type { ActionOptions, ActionPath, ActionBody } from "./client"
import type { SignalOpenstackOptions } from "./shared-types"
import type { SignalOpenstackTokenType } from "./token"
import * as client from "./client"
import { SignalOpenstackError } from "./error"

export interface ServiceActionOptions extends SignalOpenstackOptions {
  queryParams?: Record<string, string | number | boolean | string[]>
}

/**
 * Once the service is created, it can be used to make requests to the service
 * You can specify options like region, interfaceName, headers, and debug on the service level
 * or on the action level. The action level options will override the service level options.
 *
 * @param name
 * @param token
 * @param serviceOptions
 * @returns Service object with head, get, post, put, patch, del methods
 * @throws SignalOpenstackError
 */
export function SignalOpenstackService(
  name: string,
  token: SignalOpenstackTokenType,
  serviceOptions: SignalOpenstackOptions
) {
  // this functions builds the client parameters based on the service options and the client options
  // It allows to override the service options with the client options
  const clientParams = async (clientOptions: SignalOpenstackOptions): Promise<ActionOptions> => {
    if (token === undefined || token === null) throw new SignalOpenstackError("No valid token available")

    const {
      interfaceName = "public",
      region,
      headers,
      debug,
    } = {
      ...serviceOptions,
      ...clientOptions,
    }

    const serviceEndpoint = token.serviceEndpoint(name, { interfaceName, region })

    if (serviceEndpoint === undefined || serviceEndpoint === null) {
      throw new SignalOpenstackError(`Service ${name} (region: ${region}, interface: ${interfaceName}) not found.`)
    }

    return {
      host: serviceEndpoint,
      headers: { ...headers, "X-Auth-Token": token.authToken },
      debug,
    }
  }

  // expose the public functions
  return {
    head: async (path: ActionPath, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.head(path, params)),

    get: async (path: ActionPath, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.get(path, params)),

    post: async (path: ActionPath, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.post(path, values, { ...params })),

    put: async (path: ActionPath, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.put(path, values, { ...params })),

    patch: async (path: ActionPath, values: ActionBody, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.patch(path, values, { ...params })),

    del: async (path: ActionPath, options: ServiceActionOptions) =>
      clientParams(options).then((params) => client.del(path, params)),
  }
}

export type SignalOpenstackServiceType = ReturnType<typeof SignalOpenstackService>
