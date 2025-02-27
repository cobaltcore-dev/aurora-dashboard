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
}
