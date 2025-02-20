import { AuroraSignalError, AuroraSignalApiError } from "./error"

const buildRequestUrl = function (base?: string, path?: string): URL {
  // If `path` is a full URL, return it
  if (path?.startsWith("http")) {
    return new URL(path)
  }

  // If `base` is not provided, we cannot construct the URL
  if (!base) {
    throw new AuroraSignalError("Base URL is required when path is not a full URL.")
  }

  // Construct the full URL based on the conditions
  const baseUrl = new URL(base)

  if (path?.startsWith("/")) {
    // Replace the base path with the new path
    baseUrl.pathname = path
  } else if (path) {
    // Append the path to the base's existing path
    baseUrl.pathname = baseUrl.pathname.replace(/\/$/, "") + "/" + path.replace(/^\//, "")
  }

  // Return the constructed URL
  return baseUrl
}

interface RequestParams {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
  path: string
  options: {
    host?: string
    headers?: Record<string, string>
    body?: object
    debug?: boolean
  }
}

const request = ({ method, path, options }: RequestParams) => {
  const url = buildRequestUrl(options.host, path)
  const body = options.body && JSON.stringify(options.body)

  if (options.debug) {
    console.debug(
      `Debug: url = ${url.toString()}, headers = ${JSON.stringify({ ...options.headers }, null, 2)}, body = ${body}`
    )
  }

  return fetch(url.toString(), {
    headers: { ...options.headers },
    method,
    body,
  }).then((response) => {
    if (response.ok) {
      return response
    } else {
      throw new AuroraSignalApiError(response.statusText, response.status)
    }
  })
}

export type ActionOptions = Omit<RequestParams["options"], "body">
export type ActionBody = RequestParams["options"]["body"]

export function get(path: string, options: ActionOptions) {
  return request({ method: "GET", path, options })
}

export function head(path: string, options: ActionOptions) {
  return request({ method: "HEAD", path, options })
}

export function del(path: string, options: ActionOptions) {
  return request({ method: "DELETE", path, options })
}

export function post(path: string, values: ActionBody, options: ActionOptions) {
  return request({ method: "POST", path, options: { ...options, body: values } })
}

export function put(path: string, values: ActionBody, options: ActionOptions) {
  return request({ method: "PUT", path, options: { ...options, body: values } })
}

export function patch(path: string, values: ActionBody, options: ActionOptions) {
  return request({ method: "PATCH", path, options: { ...options, body: values } })
}
