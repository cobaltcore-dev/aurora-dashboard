import React from "react"
import { GardenerDialog } from "./ui/GardenerDialog"
import { GardenerButton } from "./ui/GardenerButton"

interface DeleteClusterGardenerDialogProps {
  isOpen: boolean
  clusterName: string
  onClose: () => void
  onDelete: (clusterName: string) => void
}

export const DeleteClusterDialog: React.FC<DeleteClusterGardenerDialogProps> = ({
  isOpen,
  onClose,
  clusterName,
  onDelete,
}) => {
  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onDelete(clusterName)
  }

  return (
    <GardenerDialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-aurora-black/50">
        <div className="bg-aurora-gray-900 border border-aurora-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-y-auto">
          <div className="space-y-8">
            {/* Header */}
            <div className="px-8 pt-8">
              <h2 className="text-xl font-semibold text-aurora-white text-left">Delete Cluster</h2>
            </div>

            {/* Content */}
            <div className="px-8 space-y-6">
              {/* Question */}
              <p className="text-aurora-gray-300 text-base text-left">
                Would you like to remove the <strong className="text-aurora-white font-semibold">{clusterName}</strong>{" "}
                from your project?
              </p>

              {/* Consequence */}
              <p className="text-aurora-gray-300 text-base text-left">
                After continuing, your project will no longer have access to the{" "}
                <strong className="text-aurora-white font-semibold">{clusterName}</strong> resources.
              </p>

              {/* Warning */}
              <div className="bg-aurora-amber-950/20 border border-aurora-amber-800/50 rounded-lg p-5">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-aurora-amber-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-aurora-amber-500 font-medium text-left">Warning</h4>
                    <p className="text-aurora-gray-300 text-sm mt-1 text-left">
                      This action cannot be undone. The cluster will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-8 pb-8 mt-8">
              <GardenerButton variant="secondary" onClick={onClose}>
                Cancel
              </GardenerButton>
              <GardenerButton
                variant="destructive"
                onClick={(e) => {
                  onClose()
                  handleDelete(e)
                }}
              >
                Delete Cluster
              </GardenerButton>
            </div>
          </div>
        </div>
      </div>
    </GardenerDialog>
  )
}
