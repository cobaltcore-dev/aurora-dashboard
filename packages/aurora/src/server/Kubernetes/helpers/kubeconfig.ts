import { TRPCError } from "@trpc/server"

/**
 * Decodes a base64-encoded kubeconfig.
 * Strict validation as in Elektra's decode.
 */
export function decodeKubeconfig(b64: string): string {
  // Validate base64 format
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Kubeconfig generation failed.",
    })
  }

  try {
    return Buffer.from(b64, "base64").toString("utf8")
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Kubeconfig generation failed.",
    })
  }
}

/**
 * Builds a garden kubeconfig YAML for kubectl access to the Gardener garden cluster.
 *
 * Intentional exception: returns the user's project-scoped Keystone token (as `<region>:<token>`)
 * so kubectl can reach the garden cluster; parity with Elektra (D2). Never log this value.
 *
 * See elektra/plugins/kubernetes_ng/app/services/service_layer/gardener_api.rb#build_garden_kubeconfig
 */
export function buildGardenKubeconfig(opts: { server: string; namespace: string; token: string }): string {
  // Use JSON.stringify for safe YAML scalar quoting (all scalars are double-quoted strings)
  return `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: ${JSON.stringify(opts.server)}
  name: "garden"
contexts:
- context:
    cluster: "garden"
    user: "garden-user"
    namespace: ${JSON.stringify(opts.namespace)}
  name: "garden"
current-context: "garden"
users:
- name: "garden-user"
  user:
    token: ${JSON.stringify(opts.token)}
`
}
