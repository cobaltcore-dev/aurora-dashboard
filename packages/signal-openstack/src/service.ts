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
  const clientParams = (clientOptions?: SignalOpenstackOptions & ServiceActionOptions): ActionOptions => {
    if (token === undefined || token === null) throw new SignalOpenstackError("No valid token available")

    const {
      interfaceName = "public",
      region,
      headers,
      debug,
      queryParams,
    } = {
      ...serviceOptions,
      ...clientOptions,
    }

    const serviceEndpoint = token.serviceEndpoint(name, { interfaceName, region })

    if (debug) {
      console.debug("===Signal Openstack Debug: ", { name, region, interfaceName, serviceEndpoint })
    }

    if (serviceEndpoint === undefined || serviceEndpoint === null) {
      throw new SignalOpenstackError(`Service ${name} (region: ${region}, interface: ${interfaceName}) not found.`)
    }

    return {
      host: serviceEndpoint,
      headers: { ...headers, "X-Auth-Token": token.authToken },
      debug,
      queryParams,
    }
  }

  function availableEndpoints() {
    const service = token?.tokenData?.catalog?.find((service) => service.name === name || service.type === name)
    return service?.endpoints
  }

  // expose the public functions
  return {
    availableEndpoints,
    head: async (path: ActionPath, options?: ServiceActionOptions) => client.head(path, clientParams(options)),

    get: async (path: ActionPath, options?: ServiceActionOptions) => client.get(path, clientParams(options)),

    post: async (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.post(path, values, { ...clientParams(options) }),

    put: async (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.put(path, values, { ...clientParams(options) }),

    patch: async (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.patch(path, values, { ...clientParams(options) }),

    del: async (path: ActionPath, options?: ServiceActionOptions) => client.del(path, clientParams(options)),

    // Cancellable methods
    cancellableHead: (path: ActionPath, options?: ServiceActionOptions) =>
      client.cancellableHead(path, clientParams(options)),

    cancellableGet: (path: ActionPath, options?: ServiceActionOptions) =>
      client.cancellableGet(path, clientParams(options)),

    cancellablePost: (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.cancellablePost(path, values, { ...clientParams(options) }),

    cancellablePut: (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.cancellablePut(path, values, { ...clientParams(options) }),

    cancellablePatch: (path: ActionPath, values: ActionBody, options?: ServiceActionOptions) =>
      client.cancellablePatch(path, values, { ...clientParams(options) }),

    cancellableDel: (path: ActionPath, options?: ServiceActionOptions) =>
      client.cancellableDel(path, clientParams(options)),
  }
}

export type SignalOpenstackServiceType = ReturnType<typeof SignalOpenstackService>
