import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components/index"
import React from "react"

interface ActivityRingProps {
  progress: number // Progress percentage (0-100)
  color: string // Color of the ring
  size?: number // Size of the ring (default: 100)
  strokeWidth?: number // Width of the stroke (default: 8)
  label: string // Label for the ring
  value: string // Value to display inside the ring
}
// Activity ring component inspired by Apple's activity rings
const ActivityRing = ({ progress, color, size = 100, strokeWidth = 8, label, value }: ActivityRingProps) => {
  const radius = size / 2
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg height={size} width={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle */}
          <circle
            stroke={`${color}33`}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div className="text-xl font-bold text-gray-200">{value}</div>
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-300">{label}</div>
    </div>
  )
}

// Interface for activity data props
interface ActivityData {
  instances: {
    current: number
    total: number
    quota: number
    color: string
  }
  cpu: {
    percentage: number
    cores: number
    color: string
  }
  memory: {
    percentage: number
    usedMB: number
    color: string
  }
  storage: {
    percentage: number
    sizeGB: number
    color: string
  }
  images: {
    active: number
    total: number
    color: string
  }
}

// Updated ActivitySummary component with memory circle
export function ActivitySummary({ activityData }: { activityData: ActivityData }) {
  return (
    <Stack distribution="center" alignment="center" direction="vertical">
      <ContentHeading className="text-xl font-semibold my-6">Activity Summary</ContentHeading>
      <div className="flex flex-wrap justify-start gap-16">
        <ActivityRing
          progress={(activityData.instances.current / activityData.instances.quota) * 100}
          color={activityData.instances.color}
          label="Instances"
          value={`${activityData.instances.current}/${activityData.instances.total}`}
          size={120}
        />
        <ActivityRing
          progress={activityData.cpu.percentage}
          color={activityData.cpu.color}
          label="CPU"
          value={`${activityData.cpu.percentage}%`}
          size={120}
        />
        <ActivityRing
          progress={activityData.memory.percentage}
          color={activityData.memory.color}
          label="Memory"
          value={`${activityData.memory.percentage}%`}
          size={120}
        />
        <ActivityRing
          progress={activityData.storage.percentage}
          color={activityData.storage.color}
          label="Storage"
          value={`${activityData.storage.percentage}%`}
          size={120}
        />
      </div>
    </Stack>
  )
}
