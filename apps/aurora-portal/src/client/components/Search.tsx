// import { useState, useRef } from "react"
import { Icon } from "./Icon"

export function Search() {
  // const [searchTerm, setSearchTerm] = useState<string>("")
  // const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  // const debouncedSetServerSearchTerm = (term: string) => {
  //   if (timeoutRef.current) {
  //     clearTimeout(timeoutRef.current)
  //   }
  //   timeoutRef.current = setTimeout(() => {
  //     onChange(term)
  //   }, 500)
  // }

  return (
    <div className="flex-1 min-w-[60%] relative flex items-center bg-[#1c2026] border border-[#30363d] rounded-md px-3 py-2 text-gray-300">
      <Icon name="search" className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder="Search..."
        className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-full"
        // value={searchTerm}
        // onChange={(e) => {
        //   debouncedSetServerSearchTerm(e.target.value)
        //   // setSearchTerm(e.target.value)
        // }}
      />
    </div>
  )
}
