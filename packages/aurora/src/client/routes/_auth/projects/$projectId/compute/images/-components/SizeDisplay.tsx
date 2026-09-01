import { formatBytesDecimal } from "@/client/utils/formatBytes"

interface SizeDisplayProps {
  size: number | null | undefined
}

export function SizeDisplay({ size }: SizeDisplayProps) {
  if (size === undefined) return <span>N/A</span>

  return <span>{formatBytesDecimal(size)}</span>
}
