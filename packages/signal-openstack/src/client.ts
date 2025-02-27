import { SignalOpenstackError, SignalOpenstackApiError } from "./error"

interface RequestParams {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
  path: string
  options?: {
    host?: string
    headers?: Record<string, string>
    body?: string | object
    queryParams?: Record<string, string | string[] | number | boolean | null | undefined>
    debug?: boolean
  }
}

const buildRequestUrl = function ({ base, path }: { base?: string; path?: string }): URL {
  // If `path` is a full URL, return it
  if (path?.startsWith("http")) return new URL(path)

  // If `base` is not provided, we cannot construct the URL
  if (!base) throw new SignalOpenstackError("Base URL is required when path is not a full URL.")

  // Construct the full URL based on the conditions
  const baseUrl = new URL(base)

  if (path) {
    baseUrl.pathname = path.startsWith("/") ? path : `${baseUrl.pathname.replace(/\/$/, "")}/${path}`
  }
  // Return the constructed URL
  return baseUrl
}

function buildSearchParams(params: NonNullable<RequestParams["options"]>["queryParams"]): string {
  if (!params) return ""
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value != null) // Remove null & undefined
      .flatMap(([key, value]) =>
        Array.isArray(value) ? value.map((v) => [key, v.toString()]) : [[key, value!.toString()]]
      )
  ).toString()
}

const request = ({ method, path, options = {} }: RequestParams) => {
  const url = buildRequestUrl({ base: options.host, path })
  const body = options.body && JSON.stringify(options.body)

  if (options.queryParams) {
    url.search = buildSearchParams(options.queryParams)
  }

  if (options.debug) {
    console.debug(
      `===Signal Openstack Debug: url = ${url.toString()}, headers = ${JSON.stringify({ ...options.headers }, null, 2)}, body = ${body}`
    )
  }

  return fetch(url.toString(), {
    headers: { ...options.headers },
    method,
    body,
  })
    .then((response) => {
      if (response.ok) {
        return response
      } else {
        throw new SignalOpenstackApiError(response.statusText, response.status)
      }
    })
    .catch((error) => {
      throw new SignalOpenstackApiError(error.message)
    })
}

export type ActionOptions = Omit<RequestParams["options"], "body">
export type ActionBody = NonNullable<RequestParams["options"]>["body"]
export type ActionPath = RequestParams["path"]

export function get(path: ActionPath, options?: ActionOptions) {
  return request({ method: "GET", path, options })
}

export function head(path: ActionPath, options?: ActionOptions) {
  return request({ method: "HEAD", path, options })
}

export function del(path: ActionPath, options?: ActionOptions) {
  return request({ method: "DELETE", path, options })
}

export function post(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "POST", path, options: { ...options, body: values } })
}

export function put(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "PUT", path, options: { ...options, body: values } })
}

export function patch(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "PATCH", path, options: { ...options, body: values } })
}
