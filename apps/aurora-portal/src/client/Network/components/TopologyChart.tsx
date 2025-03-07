import { useEffect, useRef, useState } from "react"
import { drawSvg } from "./drawSvg"
import { topologyData as data } from "./data"
interface TopologyChartProps {
  width: number
  height: number
}
export function TopologyChart({ width, height }: TopologyChartProps) {
  const inputRef = useRef<HTMLDivElement>(null)
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    if (!hasRendered) {
      drawSvg({ inputRef, width, height, data })
      setHasRendered(true)
    }
  }, [hasRendered])

  return (
    <div className="border-2 border-blue-500 bg-juno-grey-light-5 rounded-lg overflow-auto max-w-full max-h-full p-4">
      <div
        ref={inputRef}
        className="relative"
        style={{ width: width * 2, height: height * 2, minWidth: "1600px", minHeight: "1000px" }} // Double the size
      ></div>
    </div>
  )
}
