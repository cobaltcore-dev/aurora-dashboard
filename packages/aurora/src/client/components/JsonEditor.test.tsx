import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JsonEditor } from "./JsonEditor"

describe("JsonEditor", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<JsonEditor {...defaultProps} data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor")).toBeInTheDocument()
      expect(screen.getByTestId("json-editor-textarea")).toBeInTheDocument()
    })

    it("renders with initial value", () => {
      const value = '{"key": "value"}'
      render(<JsonEditor {...defaultProps} value={value} data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor-textarea")).toHaveValue(value)
    })

    it("renders placeholder when empty", () => {
      render(<JsonEditor {...defaultProps} placeholder="Enter JSON..." data-testid="json-editor" />)
      expect(screen.getByPlaceholderText("Enter JSON...")).toBeInTheDocument()
    })

    it("applies custom className", () => {
      render(<JsonEditor {...defaultProps} className="custom-class" data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor")).toHaveClass("custom-class")
    })

    it("renders with id and name attributes", () => {
      render(<JsonEditor {...defaultProps} id="my-editor" name="policy" data-testid="json-editor" />)
      const textarea = screen.getByTestId("json-editor-textarea")
      expect(textarea).toHaveAttribute("id", "my-editor")
      expect(textarea).toHaveAttribute("name", "policy")
    })
  })

  describe("Line numbers", () => {
    it("shows line numbers by default", () => {
      render(<JsonEditor {...defaultProps} value={"line1\nline2\nline3"} data-testid="json-editor" />)
      const lineNumbers = screen.getByTestId("json-editor-line-numbers")
      expect(lineNumbers).toBeInTheDocument()
      expect(lineNumbers.children).toHaveLength(3)
    })

    it("hides line numbers when showLineNumbers is false", () => {
      render(<JsonEditor {...defaultProps} showLineNumbers={false} data-testid="json-editor" />)
      expect(screen.queryByTestId("json-editor-line-numbers")).not.toBeInTheDocument()
    })

    it("shows at least one line number for empty value", () => {
      render(<JsonEditor {...defaultProps} value="" data-testid="json-editor" />)
      const lineNumbers = screen.getByTestId("json-editor-line-numbers")
      expect(lineNumbers.children).toHaveLength(1)
    })

    it("updates line numbers when value changes", () => {
      const { rerender } = render(<JsonEditor {...defaultProps} value="line1" data-testid="json-editor" />)
      let lineNumbers = screen.getByTestId("json-editor-line-numbers")
      expect(lineNumbers.children).toHaveLength(1)

      rerender(<JsonEditor {...defaultProps} value={"line1\nline2\nline3\nline4"} data-testid="json-editor" />)
      lineNumbers = screen.getByTestId("json-editor-line-numbers")
      expect(lineNumbers.children).toHaveLength(4)
    })
  })

  describe("onChange", () => {
    it("calls onChange when typing", async () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea")
      fireEvent.change(textarea, { target: { value: "test" } })

      expect(onChange).toHaveBeenCalledWith("test")
    })
  })

  describe("onBlur", () => {
    it("calls onBlur when textarea loses focus", () => {
      const onBlur = vi.fn()
      render(<JsonEditor {...defaultProps} onBlur={onBlur} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea")
      fireEvent.blur(textarea)

      expect(onBlur).toHaveBeenCalled()
    })
  })

  describe("Disabled state", () => {
    it("disables textarea when disabled prop is true", () => {
      render(<JsonEditor {...defaultProps} disabled data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor-textarea")).toBeDisabled()
    })

    it("applies opacity when disabled", () => {
      render(<JsonEditor {...defaultProps} disabled data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor")).toHaveClass("opacity-60")
    })

    it("does not call onChange when disabled", async () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} onChange={onChange} disabled data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea")
      fireEvent.keyDown(textarea, { key: "Tab" })

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe("Error state", () => {
    it("applies error border class when error prop is set", () => {
      render(<JsonEditor {...defaultProps} error="Invalid JSON" data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor")).toHaveClass("border-theme-error")
    })

    it("sets aria-invalid when error is present", () => {
      render(<JsonEditor {...defaultProps} error="Invalid JSON" data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor-textarea")).toHaveAttribute("aria-invalid", "true")
    })

    it("does not have error border class when error is null", () => {
      render(<JsonEditor {...defaultProps} error={null} data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor")).not.toHaveClass("border-theme-error")
    })
  })

  describe("Tab key handling", () => {
    it("inserts spaces on Tab key", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="test" onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(0, 0)
      fireEvent.keyDown(textarea, { key: "Tab" })

      expect(onChange).toHaveBeenCalledWith("  test")
    })

    it("respects custom indentSize", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="test" onChange={onChange} indentSize={4} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(0, 0)
      fireEvent.keyDown(textarea, { key: "Tab" })

      expect(onChange).toHaveBeenCalledWith("    test")
    })

    it("dedents on Shift+Tab", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="  test" onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(2, 2)
      fireEvent.keyDown(textarea, { key: "Tab", shiftKey: true })

      expect(onChange).toHaveBeenCalledWith("test")
    })
  })

  describe("Enter key handling", () => {
    it("adds newline with same indentation", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="  test" onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(6, 6) // End of "  test"
      fireEvent.keyDown(textarea, { key: "Enter" })

      expect(onChange).toHaveBeenCalledWith("  test\n  ")
    })

    it("increases indentation after opening brace", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="{" onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(1, 1) // After "{"
      fireEvent.keyDown(textarea, { key: "Enter" })

      expect(onChange).toHaveBeenCalledWith("{\n  ")
    })

    it("increases indentation after opening bracket", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value="[" onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(1, 1) // After "["
      fireEvent.keyDown(textarea, { key: "Enter" })

      expect(onChange).toHaveBeenCalledWith("[\n  ")
    })
  })

  describe("Closing brace/bracket auto-dedent", () => {
    it("auto-dedents closing brace on whitespace-only line", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value={"{\n  "} onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(5, 5) // After "  " on second line
      fireEvent.keyDown(textarea, { key: "}" })

      expect(onChange).toHaveBeenCalledWith("{\n}")
    })

    it("auto-dedents closing bracket on whitespace-only line", () => {
      const onChange = vi.fn()
      render(<JsonEditor {...defaultProps} value={"[\n  "} onChange={onChange} data-testid="json-editor" />)

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(5, 5) // After "  " on second line
      fireEvent.keyDown(textarea, { key: "]" })

      expect(onChange).toHaveBeenCalledWith("[\n]")
    })

    it("does not auto-dedent when not on whitespace-only line", () => {
      const onChange = vi.fn()
      render(
        <JsonEditor {...defaultProps} value={'{\n  "key": "value"'} onChange={onChange} data-testid="json-editor" />
      )

      const textarea = screen.getByTestId("json-editor-textarea") as HTMLTextAreaElement
      textarea.setSelectionRange(19, 19) // End of value
      fireEvent.keyDown(textarea, { key: "}" })

      // Should not call onChange since it's not a whitespace-only line
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("has aria-hidden on line numbers", () => {
      render(<JsonEditor {...defaultProps} data-testid="json-editor" />)
      expect(screen.getByTestId("json-editor-line-numbers")).toHaveAttribute("aria-hidden", "true")
    })

    it("disables spellcheck and autocomplete", () => {
      render(<JsonEditor {...defaultProps} data-testid="json-editor" />)
      const textarea = screen.getByTestId("json-editor-textarea")
      expect(textarea).toHaveAttribute("spellcheck", "false")
      expect(textarea).toHaveAttribute("autocomplete", "off")
    })

    it("links aria-describedby to error element when error and id are present", () => {
      render(<JsonEditor {...defaultProps} id="my-editor" error="Invalid JSON" data-testid="json-editor" />)
      const textarea = screen.getByTestId("json-editor-textarea")
      expect(textarea).toHaveAttribute("aria-describedby", "my-editor-error")

      const errorElement = document.getElementById("my-editor-error")
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent("Invalid JSON")
    })

    it("does not render error element when id is missing", () => {
      render(<JsonEditor {...defaultProps} error="Invalid JSON" data-testid="json-editor" />)
      const textarea = screen.getByTestId("json-editor-textarea")
      expect(textarea).not.toHaveAttribute("aria-describedby")
    })
  })

  describe("Height styling", () => {
    it("applies h-full to inner wrapper for flexible height", () => {
      render(<JsonEditor {...defaultProps} data-testid="json-editor" />)
      const container = screen.getByTestId("json-editor")
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass("h-full")
    })

    it("accepts height classes via className prop", () => {
      render(<JsonEditor {...defaultProps} className="h-96" data-testid="json-editor" />)
      const container = screen.getByTestId("json-editor")
      expect(container).toHaveClass("h-96")
    })
  })
})
