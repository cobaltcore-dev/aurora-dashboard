import { useCallback, useState } from "react"

type UseModalReturn = [boolean, () => void]

export const useModal = (initialState: boolean = false): UseModalReturn => {
  const [open, setOpen] = useState(initialState)

  const toggleOpen = useCallback(() => {
    setOpen((open) => !open)
  }, [])

  return [open, toggleOpen]
}
