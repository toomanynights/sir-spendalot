import { useEffect, useRef, useState } from 'react'

/**
 * SubcategorySuggestions
 *
 * A custom autocomplete input that replaces the unreliable <datalist> element
 * (broken on iOS Safari / many Android browsers) with a styled floating dropdown.
 *
 * Props:
 *   label        — optional label text above the input
 *   placeholder  — input placeholder
 *   value        — controlled value (string)
 *   onChange     — called with the new string value (not an event)
 *   suggestions  — array of strings to show as suggestions
 *   disabled     — disables the input
 *   id           — forwarded to the <input> for label association
 */
export default function SubcategorySuggestions({
  label,
  placeholder,
  value,
  onChange,
  suggestions = [],
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes((value || '').toLowerCase())
  )

  const showDropdown = open && !disabled && filtered.length > 0

  // Close dropdown on outside pointer-down
  useEffect(() => {
    function handlePointerDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // Scroll highlighted item into view inside the dropdown
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex]
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  function select(val) {
    onChange(val)
    setOpen(false)
    setHighlightIndex(-1)
  }

  function handleKeyDown(e) {
    if (!showDropdown) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filtered.length > 0) {
        setOpen(true)
        setHighlightIndex(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      select(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        className="input w-full"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setHighlightIndex(-1)
          setOpen(true)
        }}
        onFocus={() => {
          if (!disabled) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && (
        <ul ref={listRef} className="subcategory-dropdown" role="listbox">
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === highlightIndex}
              className={`subcategory-dropdown-item${i === highlightIndex ? ' subcategory-dropdown-item-active' : ''}`}
              onPointerDown={(e) => {
                // Prevent blur before the click registers
                e.preventDefault()
                select(s)
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
