import { useEffect, useState, useRef } from "react"
import { TopologyChart } from "./components/TopologyChart"

export function NetworkOverview() {
  // **Ref for container and state for dimensions**
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight

        setDimensions({
          width: Math.min(containerWidth * 0.9, 1200), // 90% of container, max 1200px
          height: containerHeight,
        })
      }
    }

    window.addEventListener("resize", updateSize)
    updateSize() // Initial update

    return () => window.removeEventListener("resize", updateSize)
  }, [])

  return (
    <div
      ref={containerRef}
      className="container max-w-screen-3xl  max-h-screen-3xl mx-auto px-6 py-4 grid grid-cols-12 gap-4"
    >
      {/* Row 1: Title & Navigation */}
      <div className="col-span-2 flex flex-col justify-center">
        <h3 className="text-3xl font-medium text-juno-grey-light-1 text-justify pl-5">Network</h3>
      </div>

      {/* Row 2: Sidebar & Main Content */}
      <div className="col-span-12 flex flex-col gap-4">
        <div className="w-full">
          {/* Pass dynamically calculated width & height */}
          <TopologyChart width={dimensions.width} height={dimensions.height} />
        </div>
      </div>
    </div>
  )
}
