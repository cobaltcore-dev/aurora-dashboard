import { parseErrorObject } from "./responseErrorHandler"
import { SignalOpenstackError, SignalOpenstackApiError } from "./error"
import type { ProxyConfig } from "./shared-types"
import { logger, loggerConfig } from "./logger"

/**
 * Creates a proxy dispatcher from the provided proxy configuration
 * TLS certificate validation is disabled when using a proxy since the proxy
 * (e.g., mitmproxy) acts as a man-in-the-middle for debugging purposes
 * @param proxyConfig - Proxy configuration object
 * @returns Undici ProxyAgent dispatcher or undefined if creation fails
 */
function createProxyDispatcher(proxyConfig: ProxyConfig): unknown {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic import needed for optional undici dependency
    const { ProxyAgent } = require("undici")
    return new ProxyAgent({
      uri: proxyConfig.uri,
      // Always disable TLS validation for proxy debugging (mitmproxy uses self-signed certs)
      requestTls: {
        rejectUnauthorized: false,
      },
    })
  } catch (err) {
    logger.warn("Could not configure proxy", err)
    return undefined
  }
}

interface RequestParams {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"
  path: string
  options?: {
    host?: string
    headers?: Record<string, string>
    body?: string | object | FormData | Blob | ArrayBuffer | ReadableStream
    queryParams?: Record<string, string | string[] | number | boolean | null | undefined>
    signal?: AbortSignal
    debug?: boolean
    proxy?: ProxyConfig
  }
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
    const requestUrl = new URL(`${base}${path.startsWith("/") ? path : "/" + path}`)

    // Merge search parameters from URL and request options object
    requestUrl.search += searchParams ? `&${searchParams}` : ""

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

  let body: string | FormData | Blob | ArrayBuffer | ReadableStream | undefined
  const headers = { ...options.headers }

  if (options.body) {
    if (
      (typeof ReadableStream !== "undefined" && options.body instanceof ReadableStream) ||
      options.body instanceof FormData ||
      options.body instanceof Blob ||
      options.body instanceof ArrayBuffer
    ) {
      body = options.body
    } else if (typeof options.body === "string") {
      body = options.body
    } else {
      body = JSON.stringify(options.body)
      // Only set Content-Type if not already provided
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json"
      }
    }
  }

  if (options.debug) {
    logger.debug(`${method} ${url.pathname}${url.search}`, {
      method,
      url: url.toString(),
      headers,
      body: options.body,
      queryParams: options.queryParams,
    })
  }

  // Create proxy dispatcher if proxy config is provided
  const proxyDispatcher = options.proxy ? createProxyDispatcher(options.proxy) : undefined

  if (process.env.NODE_ENV !== "production") {
    if (options.debug && proxyDispatcher) {
      console.log("✅ [signal-openstack] Using proxy dispatcher for request to:", url.toString())
    } else if (options.debug && options.proxy && !proxyDispatcher) {
      console.warn("⚠️ [signal-openstack] Proxy config provided but dispatcher creation failed")
    }
  }

  return fetch(url.toString(), {
    headers,
    method,
    body,
    signal: options.signal,
    ...(proxyDispatcher ? { dispatcher: proxyDispatcher } : {}),
    // ✅ Enable duplex for streaming uploads
    //@ts-expect-error No overload matches this call.
    duplex: "half", // TypeScript types don't include duplex yet
  })
    .then(async (response) => {
      // Log response if debug is enabled
      if (options.debug) {
        // Clone the response so we can read it for logging without consuming the original
        const clonedResponse = response.clone()
        const contentType = clonedResponse.headers.get("content-type")

        // Convert headers to object for logging
        const responseHeaders: Record<string, string> = {}
        clonedResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })

        // Try to read response body preview (first N chars based on config)
        let bodyPreview: string
        try {
          if (contentType?.includes("application/json")) {
            const text = await clonedResponse.text()
            const maxLen = loggerConfig.maxBodyPreviewLength
            bodyPreview = text.length > maxLen ? text.substring(0, maxLen) + "..." : text
          } else if (contentType?.includes("text/")) {
            const text = await clonedResponse.text()
            const maxLen = loggerConfig.maxBodyPreviewLength
            bodyPreview = text.length > maxLen ? text.substring(0, maxLen) + "..." : text
          } else {
            bodyPreview = `[Binary content: ${contentType || "unknown type"}]`
          }
        } catch {
          bodyPreview = "[Error reading body]"
        }

        logger.debug(`Response ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          bodyPreview,
        })
      }

      if (response.ok) {
        return response
      } else {
        const contentType = response.headers.get("content-type")

        if (contentType?.includes("application/json")) {
          const errorObject = await response.json()
          const parsedError = parseErrorObject(errorObject)
          throw new SignalOpenstackApiError(parsedError || response.statusText, response.status)
        } else {
          const errorText = response.text ? await response.text() : ""

          throw new SignalOpenstackApiError(errorText.substring(0, 500) || response.statusText, response.status)
        }
      }
    })
    .catch((error) => {
      // Handle abort specifically
      if (error.name === "AbortError") {
        throw new SignalOpenstackError("Request canceled")
      }
      // If it's already our error type, just rethrow it
      if (error instanceof SignalOpenstackApiError || error instanceof SignalOpenstackError) {
        throw error
      }
      // Only wrap unknown errors
      throw new SignalOpenstackApiError(error.message, 500)
    })
}

export interface CancellableRequest<T = Response> {
  promise: Promise<T>
  cancel: () => void
}

// New cancellable wrapper
function cancellableRequest({ method, path, options = {} }: RequestParams): CancellableRequest {
  const abortController = new AbortController()

  const promise = request({
    method,
    path,
    options: {
      ...options,
      signal: abortController.signal,
    },
  })

  return {
    promise,
    cancel: () => abortController.abort(),
  }
}

export type ActionOptions = Omit<RequestParams["options"], "body">
export type ActionBody = NonNullable<RequestParams["options"]>["body"]
export type ActionPath = RequestParams["path"]

export function get(path: ActionPath, options?: ActionOptions) {
  return request({ method: "GET", path, options })
}

export function cancellableGet(path: ActionPath, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "GET", path, options })
}

export function head(path: ActionPath, options?: ActionOptions) {
  return request({ method: "HEAD", path, options })
}

export function cancellableHead(path: ActionPath, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "HEAD", path, options })
}

export function del(path: ActionPath, options?: ActionOptions) {
  return request({ method: "DELETE", path, options })
}
export function cancellableDel(path: ActionPath, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "DELETE", path, options })
}

export function post(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "POST", path, options: { ...options, body: values } })
}

export function cancellablePost(path: ActionPath, values: ActionBody, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "POST", path, options: { ...options, body: values } })
}

export function put(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "PUT", path, options: { ...options, body: values } })
}

export function cancellablePut(path: ActionPath, values: ActionBody, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "PUT", path, options: { ...options, body: values } })
}

export function patch(path: ActionPath, values: ActionBody, options?: ActionOptions) {
  return request({ method: "PATCH", path, options: { ...options, body: values } })
}

export function cancellablePatch(path: ActionPath, values: ActionBody, options?: ActionOptions): CancellableRequest {
  return cancellableRequest({ method: "PATCH", path, options: { ...options, body: values } })
}
