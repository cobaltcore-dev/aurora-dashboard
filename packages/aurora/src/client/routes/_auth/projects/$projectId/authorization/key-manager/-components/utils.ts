export function uuidFromRef(ref: string): string {
  return ref.split("/").pop() ?? ref
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement("textarea")
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  })
}
