import { Button, Icon } from "@cloudoperators/juno-ui-components"

type ComputeNavBarProps = {
  viewMode: "list" | "card"
  setViewMode: (mode: "list" | "card") => void
}

export function ComputeNavBar({ viewMode, setViewMode }: ComputeNavBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Title */}
      <h2 className="text-3xl font-semibold text-gray-200">Server List</h2>

      {/* Right-side controls */}
      <div className="flex items-center space-x-3">
        {/* Search Bar */}
        <div className="relative flex items-center bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
          <Icon name="search" className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search servers..."
            className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-[200px]"
          />
        </div>

        {/* View Mode Buttons */}
        <Button
          variant={viewMode === "list" ? "default" : "subdued"}
          className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-md"
          onClick={() => setViewMode("list")}
          icon="dns"
        >
          List
        </Button>
        <Button
          variant={viewMode === "card" ? "default" : "subdued"}
          className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-md"
          onClick={() => setViewMode("card")}
          icon="autoAwesomeMotion"
        >
          Card
        </Button>
      </div>
    </div>
  )
}

export default ComputeNavBar
