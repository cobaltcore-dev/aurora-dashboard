import { SignalOpenstackSessionType } from "@cobaltcore-dev/signal-openstack"

// Disable TLS certificate verification
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

export const getGardenerClient = (openstackSession?: Awaited<SignalOpenstackSessionType> | null) => {
  if (!openstackSession) return null
  const token = openstackSession.getToken()
  const gardenerService = openstackSession.service("gardener", {
    interfaceName: "public",
    headers: {
      Authorization: `Bearer ${token?.authToken}`,
      "Content-Type": "application/json",
    },
  })

  return gardenerService
}
