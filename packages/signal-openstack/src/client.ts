import { parseErrorObject } from "./responseErrorHandler"
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

function redactSensitiveData<T>(obj: T): T {
  const sensitiveKeys: string[] = ["password", "token", "secret", "key", "auth_token"]
  const redacted: T = JSON.parse(JSON.stringify(obj))

  function redactRecursive(item: unknown): void {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const objectItem = item as Record<string, unknown>
      for (const [key, value] of Object.entries(objectItem)) {
        if (sensitiveKeys.some((sensitive: string) => key.toLowerCase().includes(sensitive))) {
          objectItem[key] = "*****"
        } else if (typeof value === "object" && value !== null) {
          redactRecursive(value)
        }
      }
    } else if (Array.isArray(item)) {
      item.forEach((element) => {
        if (typeof element === "object" && element !== null) {
          redactRecursive(element)
        }
      })
    }
  }

  redactRecursive(redacted)
  return redacted
}

const buildRequestUrl = function ({
  base,
  path,
  searchParams,
}: {
  base?: string
  path?: string
  searchParams?: string
}): URL {
  // If `path` is a full URL, return it
  if (path?.startsWith("http")) return new URL(path)

  // If `base` is not provided, we cannot construct the URL
  if (!base) throw new SignalOpenstackError("Base URL is required when path is not a full URL.")

  // If path already contains query parameters, handle it differently
  if (path?.includes("?")) {
    const [pathPart, queryPart] = path.split("?")
    const requestUrl = new URL(base)
    requestUrl.pathname = pathPart.startsWith("/") ? pathPart : `${requestUrl.pathname.replace(/\/$/, "")}/${pathPart}`
    requestUrl.search = searchParams ? [queryPart, searchParams].join("&") : queryPart
    return requestUrl
  }

  // Construct the full request URL based on the conditions
  const requestUrl = new URL(base)

  if (path) {
    requestUrl.pathname = path.startsWith("/") ? path : `${requestUrl.pathname.replace(/\/$/, "")}/${path}`
  }

  if (searchParams) {
    requestUrl.search = searchParams
  }

  // Return the constructed URL
  return requestUrl
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
  const url = buildRequestUrl({
    base: options.host,
    path,
    searchParams: options.queryParams && buildSearchParams(options.queryParams),
  })

  const body = options.body && JSON.stringify(options.body)

  if (options.debug) {
    const debugData = redactSensitiveData({ method, path, options, url })
    console.debug(`===Signal Openstack Debug: `, JSON.stringify(debugData, null, 2))
  }

  return fetch(url.toString(), {
    headers: { ...options.headers },
    method,
    body,
  })
    .then(async (response) => {
      if (response.ok) {
        return response
      } else {
        const errorObject = await response.json()
        const parsedError = parseErrorObject(errorObject)
        throw new SignalOpenstackApiError(parsedError || response.statusText, response.status)
      }
    })
    .catch((error) => {
      throw new SignalOpenstackApiError(error.message, 500)
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
