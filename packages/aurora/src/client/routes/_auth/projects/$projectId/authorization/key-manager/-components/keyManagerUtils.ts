export function uuidFromRef(ref: string): string {
  return ref.split("/").pop() ?? ref
}

export function toMixedCase(value: string | null | undefined): string {
  if (!value) return "–"
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}
