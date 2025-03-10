import { useEffect, useRef } from "react"
import { drawSvg } from "./drawSvg"
import { topologyData as data } from "./data"
interface TopologyChartProps {
  width: number
  height: number
}
export function TopologyChart({ width, height }: TopologyChartProps) {
  const inputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inputRef.current === null || inputRef.current.getAttribute("data-loaded") === "true") return
    drawSvg(inputRef.current, data, { width, height })
    inputRef.current?.setAttribute("data-loaded", "true")
  }, [])

  return (
    <div className="overflow-auto max-w-full max-h-full p-4">
      <div
        ref={inputRef}
        className="relative"
        style={{ width: width * 2, height: height * 2, minWidth: "1600px", minHeight: "1000px" }} // Double the size
      ></div>
    </div>
  )
}
