function formatBytes(bytes: number | null, decimals = 2) {
  if (bytes === 0 || !bytes) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

interface SizeDisplayProps {
  size: number | null | undefined
}

export function SizeDisplay({ size }: SizeDisplayProps) {
  if (size === undefined) return <span>N/A</span>

  return <span>{formatBytes(size)}</span>
}
