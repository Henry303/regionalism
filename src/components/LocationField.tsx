import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui'

interface LocationSuggestion {
  displayName: string
  latitude: number
  longitude: number
}

interface LocationFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: LocationSuggestion) => void
  placeholder?: string
}

export function LocationField({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
}: LocationFieldProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const query = value.trim()
    if (query.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const currentRequest = ++requestId.current
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&limit=6&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en' } },
        )
        if (!response.ok) return
        const results = await response.json() as Array<{
          display_name: string
          lat: string
          lon: string
          address?: {
            town?: string
            city?: string
            village?: string
            municipality?: string
            state?: string
            region?: string
            country?: string
          }
        }>
        if (requestId.current !== currentRequest) return
        setSuggestions(results.map((result) => {
          const address = result.address
          const locality = address?.town || address?.city || address?.village || address?.municipality
          const region = address?.state || address?.region
          const parts = [locality, region, address?.country].filter(Boolean)
          return {
            displayName: parts.length > 0 ? parts.join(', ') : result.display_name,
            latitude: Number(result.lat),
            longitude: Number(result.lon),
          }
        }))
        setOpen(true)
      } catch {
        if (requestId.current === currentRequest) setSuggestions([])
      }
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [value])

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        maxLength={120}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-suggestions`}
      />
      {open && suggestions.length > 0 && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute inset-x-0 top-full z-[1200] mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.displayName}-${suggestion.latitude}-${suggestion.longitude}`}
              type="button"
              role="option"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(suggestion.displayName)
                onSelect(suggestion)
                setOpen(false)
              }}
            >
              {suggestion.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
