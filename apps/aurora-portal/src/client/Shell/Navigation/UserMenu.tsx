import { useState, useRef } from "react"

import { AuthMenu } from "../../Auth/AuthMenu"
import { trpcClient } from "../../trpcClient"
import { Icon } from "../../components/Icon"

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Check if the newly focused element is not within the menuRef
    const relatedTarget = event.relatedTarget // The element that will receive focus
    if (menuRef.current && !menuRef.current.contains(relatedTarget)) {
      setIsOpen(false) // Close the menu if the focus is outside
    }
  }

  return (
    <div className="relative" ref={menuRef} tabIndex={0} onBlur={handleBlur}>
      <button onClick={toggleMenu} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
        <Icon color="jn-global-text" name="accountCircle" className="w-6 h-6" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-4 z-50">
          <AuthMenu authClient={trpcClient["auth"]} />
        </div>
      )}
    </div>
  )
}
