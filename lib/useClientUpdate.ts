import { useRef, useState, useEffect } from 'react'

export function useClientUpdate(clientId: string, section: string) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const savedTimer = useRef<ReturnType<typeof setTimeout>>()

  function update(data: Record<string, unknown>) {
    clearTimeout(timer.current)
    setError(null)
    setSaved(false)
    timer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch(`/api/clients/${clientId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ section, data }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`)
        }
        setSaved(true)
        clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 2000)
      } catch (e) {
        setError(String(e))
      } finally {
        setSaving(false)
      }
    }, 500)
  }

  useEffect(() => () => {
    clearTimeout(timer.current)
    clearTimeout(savedTimer.current)
  }, [])

  return { update, saving, saved, error }
}
