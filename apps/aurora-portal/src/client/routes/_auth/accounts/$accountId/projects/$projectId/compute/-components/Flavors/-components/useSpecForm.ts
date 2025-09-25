import { useState, useCallback } from "react"

export const useSpecForm = (existingKeys: string[]) => {
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({})

  const validateKey = useCallback(
    (key: string): string | undefined => {
      const trimmed = key.trim()
      if (!trimmed) return "Key is required."
      if (existingKeys.includes(trimmed)) return "Key already exists."
      return undefined
    },
    [existingKeys]
  )

  const validateValue = useCallback((value: string): string | undefined => {
    return value.trim() ? undefined : "Value is required."
  }, [])

  const updateKey = useCallback(
    (newKey: string) => {
      setKey(newKey)
      if (errors.key) setErrors((prev) => ({ ...prev, key: undefined }))
    },
    [errors.key]
  )

  const updateValue = useCallback(
    (newValue: string) => {
      setValue(newValue)
      if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }))
    },
    [errors.value]
  )

  const validate = useCallback(() => {
    const keyError = validateKey(key)
    const valueError = validateValue(value)
    const newErrors = { key: keyError, value: valueError }

    setErrors(newErrors)
    return !keyError && !valueError
  }, [key, value, validateKey, validateValue])

  const reset = useCallback(() => {
    setKey("")
    setValue("")
    setErrors({})
  }, [])

  return {
    key,
    value,
    errors,
    updateKey,
    updateValue,
    validate,
    reset,
    trimmedKey: key.trim(),
    trimmedValue: value.trim(),
  }
}
