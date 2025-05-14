// components/CreateClusterWizard/WizardHeader.tsx
import React from "react"
import { X } from "lucide-react"
import { GardenerButton } from "../ui/GardenerButton"

interface WizardHeaderProps {
  onClose: () => void
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({ onClose }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold text-aurora-white">Create New Cluster</h2>
      <GardenerButton onClick={onClose} className="text-aurora-gray-400 hover:text-aurora-white">
        <X className="h-5 w-5" />
      </GardenerButton>
    </div>
  )
}
