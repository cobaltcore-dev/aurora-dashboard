import React, { useRef } from "react"
import { Icon } from "./Icon"

type SearchProps = {
  onChange: (term: string) => void
}

export function Search({ onChange: callbackSearchTerm }: SearchProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callbackSearchTerm(e.target.value)
    }, 500)
  }

  return (
    <div className="flex-1 min-w-[60%] relative flex items-center bg-[#1c2026] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
      <Icon name="search" className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder="Search..."
        className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-full"
        onChange={handleInputChange}
      />
    </div>
  )
}
