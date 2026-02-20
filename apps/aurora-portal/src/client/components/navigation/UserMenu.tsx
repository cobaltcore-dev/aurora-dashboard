import { useState, useRef } from "react"

import { AuthMenu } from "../Auth/AuthMenu"
import { trpcClient } from "../../trpcClient"
import { Icon } from "@cloudoperators/juno-ui-components"

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
      <button onClick={toggleMenu} className="align-middle">
        <Icon color="jn-global-text" icon="accountCircle" className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="bg-theme-background-lvl-1 absolute right-0 z-50 mt-2 w-48 rounded-lg p-4 shadow-lg">
          <AuthMenu authClient={trpcClient["auth"]} />
        </div>
      )}
    </div>
  )
}
