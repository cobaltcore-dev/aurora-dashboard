import React, { useState } from "react"

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
      <button
        onClick={toggleDropdown}
        data-testid="combobox-button"
        className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
      >
        {selectedValue || valueLabel}
      </button>
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
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
