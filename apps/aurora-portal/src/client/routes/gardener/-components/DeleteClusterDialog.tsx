import React from "react"
import { Button } from "@/client/components/headless-ui/Button"
import { GardenerDialog, GardenerDialogFooter, GardenerDialogTitle } from "./GardenerDialog"

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
  console.log("DeleteClusterDialog", { isOpen, clusterName, onClose, onDelete })

  return (
    <GardenerDialog open={isOpen} onOpenChange={onClose}>
      <GardenerDialogTitle className="text-xl font-semibold text-aurora-white">Delete Cluster</GardenerDialogTitle>
      <div className="space-y-2 text-left max-w-prose">
        {/* Question */}
        <p className="text-aurora-gray-300 text-base leading-relaxed">
          Would you like to remove the <strong className="text-aurora-white font-semibold">{clusterName}</strong> from
          your project?
        </p>

        {/* Consequence */}
        <p className="text-aurora-gray-300 text-base leading-relaxed">
          After continuing, your project will no longer have access to the{" "}
          <strong className="text-aurora-white font-semibold">{clusterName}</strong> resources.
        </p>

        {/* Warning */}
        <div className="bg-aurora-danger-bg/20 border border-aurora-danger/30 rounded-lg ">
          <p className="text-aurora-danger text-base font-semibold flex items-start">
            <span>
              <strong>Warning:</strong> This action cannot be undone. The cluster will be permanently deleted.
            </span>
          </p>
        </div>
      </div>
      <GardenerDialogFooter className="flex space-x-3 justify-end">
        <Button
          onClick={onClose}
          className="bg-aurora-gray-800 text-aurora-gray-300 hover:bg-aurora-gray-700 hover:text-aurora-white"
        >
          Cancel
        </Button>
        <Button
          className="bg-aurora-red-600 text-aurora-white hover:bg-aurora-red-500"
          onClick={(e) => {
            onClose()
            handleDelete(e)
          }}
        >
          Delete
        </Button>
      </GardenerDialogFooter>
    </GardenerDialog>
  )
}
