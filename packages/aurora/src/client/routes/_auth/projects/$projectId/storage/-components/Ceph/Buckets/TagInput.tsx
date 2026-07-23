import { useState, KeyboardEvent } from "react"
import { TextInput, Pill, Stack } from "@cloudoperators/juno-ui-components"

interface TagInputProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  helptext?: string
  disabled?: boolean
  validate?: (value: string) => { valid: boolean; error?: string }
  id?: string
  name?: string
}

export const TagInput = ({
  label,
  value,
  onChange,
  placeholder,
  helptext,
  disabled = false,
  validate,
  id,
  name,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState<string | undefined>()

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    }
  }

  const addTag = (tag: string) => {
    if (!tag) return

    if (validate) {
      const result = validate(tag)
      if (!result.valid) {
        setError(result.error)
        return
      }
    }

    if (value.includes(tag)) {
      setError("This value already exists")
      return
    }

    onChange([...value, tag])
    setInputValue("")
    setError(undefined)
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div>
      <TextInput
        label={label}
        id={id}
        name={name}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          setError(undefined)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue.trim())
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        helptext={helptext}
        invalid={!!error}
        errortext={error}
      />

      {value.length > 0 && (
        <Stack gap="2" wrap={true} alignment="start" distribution="start" className="mt-2">
          {value.map((tag, index) => (
            <Pill key={`${tag}-${index}`} pillValue={tag} closeable onClose={() => removeTag(tag)} />
          ))}
        </Stack>
      )}
    </div>
  )
}

export const urlValidator = (url: string): { valid: boolean; error?: string } => {
  if (url === "*") {
    return { valid: true }
  }

  try {
    const urlObj = new URL(url)
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { valid: false, error: "URL must use http or https protocol" }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format. Expected: https://example.com" }
  }
}

export const headerValidator = (header: string): { valid: boolean; error?: string } => {
  if (header === "*") {
    return { valid: true }
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(header)) {
    return {
      valid: false,
      error: "Header name can only contain letters, numbers, hyphens, and underscores",
    }
  }

  return { valid: true }
}
