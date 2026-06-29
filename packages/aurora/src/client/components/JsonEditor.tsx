import { useRef, useCallback, useMemo } from "react"
import { cn } from "@/client/utils/cn"

export interface JsonEditorProps {
  /** Current JSON string value */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Callback when editor loses focus */
  onBlur?: () => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Placeholder text when empty */
  placeholder?: string
  /** Error message to display (also shows error border) */
  error?: string | null
  /** Additional CSS class names (use height classes like h-96 to set fixed height) */
  className?: string
  /** HTML id attribute */
  id?: string
  /** HTML name attribute */
  name?: string
  /** Number of spaces for indentation (default: 2) */
  indentSize?: number
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean
  /** Test ID for testing */
  "data-testid"?: string
}

/**
 * A simple JSON editor component with line numbers and smart indentation.
 *
 * Features:
 * - Line numbers
 * - Tab key inserts spaces
 * - Enter key auto-indents based on context
 * - Closing braces/brackets auto-dedent
 * - Error state styling
 * - Accessible and keyboard-friendly
 */
export const JsonEditor = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "",
  error,
  className = "",
  id,
  name,
  indentSize = 2,
  showLineNumbers = true,
  "data-testid": testId,
}: JsonEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const indent = useMemo(() => " ".repeat(indentSize), [indentSize])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (disabled) return

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      if (e.key === "Tab") {
        e.preventDefault()

        if (e.shiftKey) {
          // Shift+Tab: dedent current line
          const lines = value.substring(0, start).split("\n")
          const currentLineStart = start - lines[lines.length - 1].length
          const currentLine = lines[lines.length - 1]

          if (currentLine.startsWith(indent)) {
            const newValue =
              value.substring(0, currentLineStart) + currentLine.substring(indentSize) + value.substring(start)
            onChange(newValue)
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start - indentSize
            }, 0)
          }
        } else {
          // Tab: insert indent
          const newValue = value.substring(0, start) + indent + value.substring(end)
          onChange(newValue)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + indentSize
          }, 0)
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        const lines = value.substring(0, start).split("\n")
        const currentLine = lines[lines.length - 1]
        const currentIndent = currentLine.match(/^\s*/)?.[0] || ""

        let newIndent = currentIndent
        const trimmedLine = currentLine.trim()

        // Increase indent after opening brace/bracket
        if (trimmedLine.endsWith("{") || trimmedLine.endsWith("[")) {
          newIndent = currentIndent + indent
        }

        const newValue = value.substring(0, start) + "\n" + newIndent + value.substring(end)
        onChange(newValue)

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length
        }, 0)
      } else if (e.key === "}" || e.key === "]") {
        const lines = value.substring(0, start).split("\n")
        const currentLine = lines[lines.length - 1]

        // Auto-dedent when typing closing brace/bracket on whitespace-only line
        if (currentLine.match(/^\s+$/) && currentLine.length >= indentSize) {
          e.preventDefault()
          const dedentedIndent = currentLine.substring(0, currentLine.length - indentSize)
          const beforeLine = value.substring(0, start - currentLine.length)
          const afterLine = value.substring(start)
          const newValue = beforeLine + dedentedIndent + e.key + afterLine
          onChange(newValue)

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - currentLine.length + dedentedIndent.length + 1
          }, 0)
        }
      }
    },
    [disabled, value, onChange, indent, indentSize]
  )

  const lineNumbers = useMemo(() => {
    const count = Math.max(value.split("\n").length, 1)
    return Array.from({ length: count }, (_, i) => i + 1)
  }, [value])

  return (
    <div
      className={cn(
        "bg-theme-background-lvl-1 overflow-hidden rounded border transition-[border-color,box-shadow] duration-150",
        "border-theme-background-lvl-3",
        "focus-within:border-theme-accent focus-within:ring-theme-accent focus-within:ring-2",
        error && "border-theme-error focus-within:ring-theme-error",
        disabled && "opacity-60",
        className
      )}
      data-testid={testId}
    >
      <div className="flex h-full overflow-auto">
        {showLineNumbers && (
          <div
            className="bg-theme-background-lvl-0 border-theme-background-lvl-3 text-theme-light shrink-0 border-r py-3 pr-3 pl-2 text-right font-mono text-xs leading-6 select-none"
            style={{ minWidth: 40 }}
            aria-hidden="true"
            data-testid={testId ? `${testId}-line-numbers` : undefined}
          >
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          className={cn(
            "text-theme-default min-w-0 flex-1 resize-none border-none bg-transparent p-3 font-mono text-xs leading-6 whitespace-pre outline-none",
            "placeholder:text-theme-light",
            "disabled:cursor-not-allowed"
          )}
          style={{ overflowX: "auto", overflowY: "hidden", tabSize: 2 }}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          data-testid={testId ? `${testId}-textarea` : undefined}
        />
      </div>
      {error && id && (
        <span id={`${id}-error`} className="sr-only">
          {error}
        </span>
      )}
    </div>
  )
}

export default JsonEditor
