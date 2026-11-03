export function uuidFromRef(ref: string): string {
  return ref.split("/").pop() ?? ref
}
