import { Button, ComboBox, ComboBoxOption } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"
import { useLocation, useParams, Link } from "@tanstack/react-router"

type ComputeNavBarProps = {
  viewMode: "list" | "card"
  setViewMode: (mode: "list" | "card") => void
}

export const ComputeSideNavBar = () => {
  const location = useLocation()

  const { projectId, domain } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { projectId: params.projectId, domain: params.accountId }
    },
  })

  const computeRootPath = `/accounts/${domain}/projects/${projectId}/compute`

  const links = [
    { path: computeRootPath, label: "Overview" },
    { path: `${computeRootPath}/instances`, label: "Instances" },
    { path: `${computeRootPath}/images`, label: "Images" },
    { path: `${computeRootPath}/keypairs`, label: "Key Pairs" },
    { path: `${computeRootPath}/servergroups`, label: "Server Groups" },
  ]

  return (
    <div className="w-full flex flex-col items-start px-4">
      {/* Navigation */}
      <nav className="w-full flex flex-col rounded-lg items-start ">
        {links.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`w-full text-base font-medium px-4 py-3 rounded-md transition text-justify
              ${
                location.pathname === path
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

export function ComputeNavBar({ viewMode, setViewMode }: ComputeNavBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Search Input (60%) */}
      <div className="flex-1 min-w-[60%] relative flex items-center bg-[#1c2026] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
        <Icon icon="search" className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-full"
        />
      </div>

      {/* Controls (30%) */}
      <div className="flex items-center gap-2 min-w-[30%] justify-end">
        <ComboBox data-testid="combobox-button" valueLabel="Sorting...">
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
        <ComboBox ariaLabel="Create Server" data-testid="combobox-button" valueLabel="Server">
          <ComboBoxOption label="Create Server" value="Server">
            Server
          </ComboBoxOption>
        </ComboBox>
      </div>
    </div>
  )
}
