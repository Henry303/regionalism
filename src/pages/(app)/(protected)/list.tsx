import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { SearchInput } from '@/components/ui'

interface Pin {
  id: string
  word: string
  meaning: string
  regionLabel: string
  lat: number
  lng: number
}

export default function PinListPage() {
  const { records, status } = useQuery<Pin>('pins')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const query = search.trim().toLowerCase()
  const filtered = records.filter(({ data }) =>
    !query ||
    data.word.toLowerCase().includes(query) ||
    data.regionLabel.toLowerCase().includes(query),
  )

  return (
    <div className="mx-auto min-h-full max-w-2xl px-4 py-6 md:hidden">
      <SearchInput
        aria-label="Search pins"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search word or region"
        className="mt-4"
      />
      <div className="mt-4 space-y-2">
        {status === 'loading' ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading regionalisms...</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query ? 'No regionalisms found.' : 'No regionalisms yet. Add the first pin from the map.'}
          </p>
        ) : filtered.map(({ recordId, data }) => (
          <button
            key={recordId}
            type="button"
            onClick={() => navigate('/home', { state: { selectedPinId: recordId } })}
            className="min-h-20 w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
          >
            <span className="block font-semibold text-foreground">{data.word}</span>
            <span className="mt-1 block text-xs font-medium text-primary">{data.regionLabel}</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{data.meaning}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
