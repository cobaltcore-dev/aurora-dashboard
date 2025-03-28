import React from "react"
import { Link } from "wouter"
import Logo from "../../assets/logo.svg?react"
import { Project } from "../../../server/Project/types/models"
import { Domain } from "../../../server/Authentication/types/models"
import { useAuroraContext } from "../AuroraProvider"

interface AuroraNavigationToolbarProps {
  scopedDomain: Domain
  scopedProject: Project | undefined
}

export const AuroraNavigationToolbar: React.FC<AuroraNavigationToolbarProps> = ({ scopedDomain, scopedProject }) => {
  const { auroraRoutes } = useAuroraContext()
  return (
    <div className="flex items-center space-x-4">
      <Link href={auroraRoutes.home} className="flex items-center space-x-3">
        <Logo className="w-6 h-6 fill-current" title="Aurora" />
        {/* Decreased logo size slightly for better alignment */}
        <span className="text-lg font-medium text-sap-grey-2">Aurora</span>
        {/* Slightly smaller font for better balance */}
      </Link>
      {scopedDomain?.id && (
        <Link href={auroraRoutes.domain(scopedDomain.id).projects} className="flex items-center space-x-3">
          <span className="text-sap-grey-1">/</span>
          <span className="font-semibold text-lg text-sap-grey-2">{scopedDomain.name}</span>
        </Link>
      )}
      {scopedProject?.name && (
        <>
          <span className="text-sap-grey-1">/</span>
          <span className="font-semibold text-lg text-sap-grey-2">{scopedProject.name}</span>
        </>
      )}
    </div>
  )
}
