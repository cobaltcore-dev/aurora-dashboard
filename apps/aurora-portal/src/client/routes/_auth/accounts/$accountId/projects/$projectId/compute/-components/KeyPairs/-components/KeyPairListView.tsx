// KeyPairListView.tsx - Component to display key pairs
import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
import type { Keypair } from "@/server/Compute/types/keypair"
import { Button } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"

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
        <Icon name="info" color="jn-text-theme-info" />
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
          <table className="w-full text-left border-collapse border border-[#30363d] text-gray-300">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className="text-gray-400 border-b border-[#30363d]">
                <th className="p-3">Key Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Fingerprint</th>
                <th className="p-3">Created</th>
                <th className="p-3 flex justify-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {keyPairs.map((keyPair, index) => (
                <tr
                  key={keyPair.id || keyPair.name}
                  className={`hover:bg-[#1e2531] ${index !== keyPairs.length - 1 ? "border-b border-[#30363d]" : ""}`}
                >
                  <td className="p-3">{keyPair.name}</td>
                  <td className="p-3">{renderKeyType(keyPair.type)}</td>
                  <td className="p-3 font-mono text-sm">{formatFingerprint(keyPair.fingerprint)}</td>
                  <td className="p-3">{formatDate(keyPair.created_at)}</td>

                  {/* Action Buttons */}
                  <td className="p-3">
                    <div className="flex space-x-3 justify-end">
                      <Button
                        className="hover:bg-gray-600"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Launch Instance",
                            description: `Launch instance using key "${keyPair.name}"`,
                            variant: "success",
                            button: {
                              label: "Dismiss",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Use
                      </Button>
                      <Button
                        className="hover:bg-gray-600"
                        onClick={() => {
                          // Copy key to clipboard
                          navigator.clipboard.writeText(keyPair.public_key || "")
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Public Key Copied",
                            description: `Public key for "${keyPair.name}" copied to clipboard`,
                            variant: "info",
                            button: {
                              label: "Close",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="primary-danger"
                        className="hover:bg-red-500"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Delete Key Pair",
                            description: `Are you sure you want to delete "${keyPair.name}"? This action cannot be undone.`,
                            variant: "error",
                            button: {
                              label: "Cancel",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No key pairs available.</p>
      )}
    </div>
  )
}
