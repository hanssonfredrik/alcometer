import { useEffect, useState } from 'react'

/**
 * A number input that can be fully erased while editing. The draft lives in
 * local state and is committed on blur / Enter; an empty or invalid draft
 * commits `fallback` instead, so the stored value is never 0-by-accident.
 * Renders a bare <input> so the parent's label/field CSS applies.
 */
export default function NumberField({
  value,
  fallback,
  onCommit,
  min = 0,
  max,
  ...rest
}) {
  const [draft, setDraft] = useState(String(value))

  // Follow external changes (reset buttons, imports) while not editing.
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    let n = parseFloat(draft)
    if (!Number.isFinite(n)) n = fallback
    if (min != null) n = Math.max(min, n)
    if (max != null) n = Math.min(max, n)
    setDraft(String(n))
    if (n !== value) onCommit(n)
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      {...rest}
    />
  )
}
