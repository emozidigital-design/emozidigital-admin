import { useState, useRef, useEffect } from "react"
import { mutate } from "swr"

export function useClientUpdate(clientId: string) {
  const timer = useRef<NodeJS.Timeout>()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  // Universal patch function for section_x or base fields
  function update(fieldOrSection: string, value: unknown) {
    clearTimeout(timer.current)
    setSaving(true)
    setSaved(false)
    setError(false)

    // Wait until they stop typing to trigger network request
    timer.current = setTimeout(async () => {
      try {
        const isSection = fieldOrSection.startsWith("section_")
        const payload = isSection 
          ? { section: fieldOrSection, data: value }
          : { field: fieldOrSection, value }

        const res = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error("Failed to save")
        
        setSaving(false)
        setSaved(true)
        mutate(`/api/clients/${clientId}`)
      } catch {
        setSaving(false)
        setError(true)
      }
      
      // hide save indicator after a short delay
      setTimeout(() => setSaved(false), 2000)
    }, 500)
  }

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  return { update, saving, saved, error }
}
