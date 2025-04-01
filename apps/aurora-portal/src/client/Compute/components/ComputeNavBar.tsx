// import { useState, useRef } from "react"
import { Link, useLocation, useParams } from "wouter"
import { ComboBox, ComboBoxOption } from "../../components/ComboBox"
import { Button } from "../../components/Button"
import { Search } from "../../components/Search"
import { useAuroraContext } from "../../Shell/AuroraProvider"

type ComputeNavBarProps = {
  viewMode: "list" | "card"
  setViewMode: (mode: "list" | "card") => void
  onChange: (term: string) => void
}

export const ComputeSideNavBar = () => {
  const [location] = useLocation()

  const { auroraRoutes } = useAuroraContext()

  const { projectId, domainId } = useParams()
  const links = [
    { path: auroraRoutes.domain(domainId).project(projectId).compute.root, label: "Overview" },
    { path: auroraRoutes.domain(domainId).project(projectId).compute.instances, label: "Instances" },
    { path: auroraRoutes.domain(domainId).project(projectId).compute.images, label: "Images" },
    { path: auroraRoutes.domain(domainId).project(projectId).compute.keypairs, label: "Key Pairs" },
    { path: auroraRoutes.domain(domainId).project(projectId).compute.servergroups, label: "Server Groups" },
  ]

  return (
    <div className="w-full flex flex-col items-start px-4">
      {/* Navigation */}
      <nav className="w-full flex flex-col rounded-lg items-start ">
        {links.map(({ path, label }) => (
          <Link
            key={path}
            href={path}
            className={`w-full text-base font-medium px-4 py-3 rounded-md transition text-justify
              ${
                location === path
                  ? "bg-juno-grey-blue-3 text-white shadow-md"
                  : "text-juno-blue-1 hover:bg-juno-grey-blue-4 hover:text-white"
              }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export function ComputeNavBar({ viewMode, setViewMode, onChange: handleSearchChange }: ComputeNavBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Search Input (60%) */}

      <Search onChange={handleSearchChange} />

      {/* Controls (30%) */}
      <div className="flex items-center gap-2 min-w-[30%] justify-end">
        <ComboBox valueLabel="Sorting...">
          <ComboBoxOption value="Sort By Name">Sort By name</ComboBoxOption>
          <ComboBoxOption value="Date">Sort by date</ComboBoxOption>
        </ComboBox>
        <div className="flex items-center gap-1 bg-juno-grey-blue-7 rounded-md">
          <Button
            data-testid="list-view"
            name="List"
            variant={viewMode === "list" ? "default" : "subdued"}
            className="text-white text-xs flex items-center justify-center rounded"
            onClick={() => setViewMode("list")}
            icon="dns"
          />

          <Button
            data-testid="card-view"
            name="Card"
            variant={viewMode === "card" ? "default" : "subdued"}
            className="text-white text-xs flex items-center justify-center rounded"
            onClick={() => setViewMode("card")}
            icon="autoAwesomeMotion"
          />
        </div>
        <ComboBox valueLabel="Server">
          <ComboBoxOption value="Server">Server</ComboBoxOption>
        </ComboBox>
      </div>
    </div>
  )
}
