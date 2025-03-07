import { useState, useRef } from "react"
import { AuthMenu } from "../../Auth/AuthMenu"
import { trpcClient } from "../../trpcClient"
import { Icon } from "@cloudoperators/juno-ui-components"

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current?.contains(e.relatedTarget)) {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={menuRef} tabIndex={0} onBlur={handleBlur}>
      <button onClick={toggleMenu} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
        <Icon color="jn-global-text" icon="accountCircle" className="w-6 h-6" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-4 z-50">
          <AuthMenu authClient={trpcClient["auth"]} />
        </div>
      )}
    </div>
  )
}
