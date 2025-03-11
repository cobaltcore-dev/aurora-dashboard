import React, { useState } from "react"
import { Button } from "./Button"

interface ComboBoxProps {
  valueLabel: string
  children: React.ReactNode
}

export const ComboBox: React.FC<ComboBoxProps> = ({ valueLabel, children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  const toggleDropdown = () => setIsOpen(!isOpen)
  const handleSelect = (value: string) => {
    setSelectedValue(value)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block text-left">
      <Button data-testid="combobox-button" onClick={toggleDropdown}>
        {selectedValue || valueLabel}
      </Button>
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg z-10">
          <div className="py-1">
            {children &&
              (Array.isArray(children) ? children : [children]).map((child) =>
                child && typeof child === "object"
                  ? React.cloneElement(child as React.ReactElement, { onSelect: handleSelect })
                  : null
              )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ComboBoxOptionProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
}

export const ComboBoxOption: React.FC<ComboBoxOptionProps> = ({ value, children, onSelect }) => {
  return (
    <button onClick={() => onSelect?.(value)} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
      {children}
    </button>
  )
}
