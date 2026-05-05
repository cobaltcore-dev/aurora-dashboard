/**
 * Proxy configuration for routing requests through a proxy server (e.g., mitmproxy for debugging)
 * When a proxy is configured, TLS certificate validation is automatically disabled
 * since the proxy (e.g., mitmproxy) acts as a man-in-the-middle for debugging purposes
 */
export interface ProxyConfig {
  /**
   * Proxy server URI (e.g., "http://localhost:8888")
   */
  uri: string
}

/**
 * SignalOpenstackOptions is the options object that can be passed to the SignalOpenstack.
 * This Options can be passed on two three levels:
 * - SignalOpenstackOptions: This options are the default options for the whole session
 * - ServiceOptions: This options are the default options for a specific service
 * - ActionOptions: This options are the options for a specific action
 */
export interface SignalOpenstackOptions {
  headers?: Record<string, string>
  debug?: boolean
  region?: string
  interfaceName?: string
  /**
   * Optional proxy configuration for debugging OpenStack API calls
   * When provided, all requests will be routed through the specified proxy
   */
  proxy?: ProxyConfig
}
