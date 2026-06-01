import type { Keypair } from "@/server/Compute/types/keypair"
import { Icon } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

interface KeyPairListViewProps {
  keyPairs: Keypair[]
}

export function KeyPairListView({ keyPairs }: KeyPairListViewProps) {
  // Helper function to format the creation date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  // Helper function to format the key type with appropriate icon
  const renderKeyType = (type: string | undefined) => {
    if (!type) return <span>SSH</span>

    return (
      <div className="flex items-center space-x-2">
        <Icon icon="info" color="text-theme-info" />
        <span>{type.toUpperCase()}</span>
      </div>
    )
  }

  // Helper function to truncate and format fingerprint
  const formatFingerprint = (fingerprint: string | undefined) => {
    if (!fingerprint) return "N/A"
    // Show first 16 characters + "..." + last 16 characters if long
    return fingerprint.length > 40
      ? `${fingerprint.substring(0, 16)}...${fingerprint.substring(fingerprint.length - 16)}`
      : fingerprint
  }

  return (
    <div>
      {keyPairs && keyPairs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr>
                <th className="p-3">
                  <Trans>Key Name</Trans>
                </th>
                <th className="p-3">
                  <Trans>Type</Trans>
                </th>
                <th className="p-3">
                  <Trans>Fingerprint</Trans>
                </th>
                <th className="p-3">
                  <Trans>Created</Trans>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {keyPairs.map((keyPair) => (
                <tr key={keyPair.id || keyPair.name}>
                  <td className="p-3">{keyPair.name}</td>
                  <td className="p-3">{renderKeyType(keyPair.type)}</td>
                  <td className="p-3 font-mono text-sm">{formatFingerprint(keyPair.fingerprint)}</td>
                  <td className="p-3">{formatDate(keyPair.created_at)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          <Trans>No key pairs available.</Trans>
        </p>
      )}
    </div>
  )
}
