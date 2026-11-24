import { useEffect, useRef, useState } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useLocation } from 'react-router-dom'
import { SearchInput } from '@/components/ui'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, Input, Modal, Textarea, useToast } from '@/components/ui'
import { LocationField } from '@/components/LocationField'
import { SAMPLE_PINS } from '../../../seed'

interface UserProfile {
  id: string
  homeRegion: string
  homeLat: number
  homeLng: number
  createdAt: number
}

interface Pin {
  id: string
  ownerId: string
  word: string
  meaning: string
  regionLabel: string
  lat: number
  lng: number
  createdAt: number
  updatedAt: number
  isDefault?: boolean
}

function LocationMapView({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 5), { duration: 0.35 })
  }, [latitude, longitude, map])

  return null
}

function OnboardingMapClick({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      onSelect(
        Math.round(event.latlng.lat * 100) / 100,
        Math.round(event.latlng.lng * 100) / 100,
      )
    },
  })
  return null
}

export default function HomePage() {
  const { isLoaded, userId } = useAuth()
  if (!isLoaded) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading...</div>
  if (!userId) return null
  return <AuthenticatedHome userId={userId} />
}

function AuthenticatedHome({ userId }: { userId: string }) {
  const { records, status } = useQuery<UserProfile>('user_profiles', {
    where: { id: userId },
  })
  const { createConfirmed: createProfile, ready: profileReady } = useMutations<UserProfile>('user_profiles')
  const { records: pins, status: pinsStatus } = useQuery<Pin>('pins')
  const { createConfirmed: createPin, ready: pinsReady } = useMutations<Pin>('pins')
  const profile = records[0]?.data
  const [region, setRegion] = useState('')
  const [latitude, setLatitude] = useState(37.87)
  const [longitude, setLongitude] = useState(-122.27)
  const [saving, setSaving] = useState(false)
  const [locationSelected, setLocationSelected] = useState(false)
  const seeded = useRef(false)
  const { success, error } = useToast()

  useEffect(() => {
    if (
      seeded.current ||
      pinsStatus !== 'ready' ||
      !pinsReady ||
      pins.length > 0
    ) {
      return
    }
    seeded.current = true
    const now = Date.now()
    void Promise.all(SAMPLE_PINS.map((sample) =>
      createPin({
        id: crypto.randomUUID(),
        ownerId: userId,
        word: sample.word,
        meaning: sample.meaning,
        regionLabel: sample.regionLabel,
        lat: sample.lat,
        lng: sample.lng,
        createdAt: now,
        updatedAt: now,
        isDefault: true,
      }),
    ))
  }, [pinsStatus, pinsReady, pins.length, createPin, userId])

  const rounded = (value: number) => Math.round(value * 100) / 100

  const saveProfile = async () => {
    const trimmedRegion = region.trim()
    if (!trimmedRegion || !locationSelected || !profileReady) return
    setSaving(true)
    try {
      await createProfile({
        id: userId,
        homeRegion: trimmedRegion,
        homeLat: rounded(latitude),
        homeLng: rounded(longitude),
        createdAt: Date.now(),
      })
      success('Location saved', 'Your approximate region is ready.')
    } catch {
      error('Could not save location', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (profile) {
    return <RegionMap profile={profile} pins={pins} pinsStatus={pinsStatus} pinsReady={pinsReady} createPin={createPin} />
  }

  return (
    <Modal open onClose={() => undefined} size="md">
      <Modal.Header>
        <Modal.Title>Set your general location</Modal.Title>
        <Modal.Description>
          Use a town, state or region and a private approximate point—never a street address.
        </Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <div>
            <label htmlFor="home-region" className="mb-1.5 block text-sm font-medium">
              Town, State/Region, Country
            </label>
            <LocationField
              id="home-region"
              value={region}
              onChange={(nextRegion) => {
                setRegion(nextRegion)
                setLocationSelected(false)
              }}
              onSelect={(suggestion) => {
                setRegion(suggestion.displayName)
                setLatitude(rounded(suggestion.latitude))
                setLongitude(rounded(suggestion.longitude))
                setLocationSelected(true)
              }}
              placeholder="Berkeley, CA, USA"
            />
          </div>
          <div className="h-52 w-full overflow-hidden rounded-lg border border-border">
            <MapContainer
              center={[latitude, longitude]}
              zoom={5}
              minZoom={2}
              dragging={false}
              touchZoom={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              boxZoom={false}
              keyboard={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMapView latitude={latitude} longitude={longitude} />
              <OnboardingMapClick
                onSelect={(nextLatitude, nextLongitude) => {
                  setLatitude(nextLatitude)
                  setLongitude(nextLongitude)
                  setLocationSelected(true)
                }}
              />
              <Marker
                position={[latitude, longitude]}
                icon={L.divIcon({
                  className: 'regionism-marker',
                  html: '<span></span>',
                  iconSize: [22, 30],
                  iconAnchor: [11, 30],
                  popupAnchor: [0, -28],
                })}
              />
            </MapContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            Approximate point: {rounded(latitude).toFixed(2)}, {rounded(longitude).toFixed(2)}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="w-full sm:w-auto"
          onClick={saveProfile}
          disabled={!region.trim() || !locationSelected}
          loading={saving}
        >
          Save location
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function MapSelection({
  selectedPinId,
  pins,
}: {
  selectedPinId: string | null
  pins: Array<{ recordId: string; data: Pin }>
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedPinId) return
    const selected = pins.find(({ recordId }) => recordId === selectedPinId)
    if (selected) {
      map.flyTo([selected.data.lat, selected.data.lng], Math.max(map.getZoom(), 5), {
        duration: 0.5,
      })
    }
  }, [map, pins, selectedPinId])

  return null
}

function RegionMap({
  profile,
  pins,
  pinsStatus,
  pinsReady,
  createPin,
}: {
  profile: UserProfile
  pins: Array<{ recordId: string; data: Pin }>
  pinsStatus: string
  pinsReady: boolean
  createPin: (data: Pin) => Promise<string>
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [wordError, setWordError] = useState('')
  const [meaningError, setMeaningError] = useState('')
  const { success, error } = useToast()
  const location = useLocation()
  const stateSelection =
    (location.state as { selectedPinId?: string } | null)?.selectedPinId
  const [selectedPinId, setSelectedPinId] = useState<string | null>(stateSelection ?? null)

  const markerIcon = (selected = false) => L.divIcon({
    className: 'regionism-marker',
    html: `<span${selected ? ' style="box-shadow:0 0 0 5px rgba(204,47,16,.22),0 2px 8px rgba(28,25,23,.28);transform:rotate(-45deg) scale(1.18)"' : ''}></span>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -32],
  })

  useEffect(() => {
    if (stateSelection) setSelectedPinId(stateSelection)
  }, [stateSelection])

  const filteredPins = pins.filter(({ data }) => {
    const query = search.trim().toLowerCase()
    return !query ||
      data.word.toLowerCase().includes(query) ||
      data.regionLabel.toLowerCase().includes(query)
  })

  const selectPin = (recordId: string) => {
    setSelectedPinId(recordId)
  }

  const savePin = async () => {
    const trimmedWord = word.trim()
    const trimmedMeaning = meaning.trim()
    const nextWordError = !trimmedWord
      ? 'Enter a word or phrase.'
      : trimmedWord.length > 60
        ? 'Keep the word or phrase to 60 characters.'
        : ''
    const nextMeaningError = !trimmedMeaning
      ? 'Enter a meaning.'
      : trimmedMeaning.length > 240
        ? 'Keep the meaning to 240 characters.'
        : ''
    setWordError(nextWordError)
    setMeaningError(nextMeaningError)
    if (nextWordError || nextMeaningError || !pinsReady) return

    setSaving(true)
    try {
      const now = Date.now()
      await createPin({
        id: crypto.randomUUID(),
        ownerId: profile.id,
        word: trimmedWord,
        meaning: trimmedMeaning,
        regionLabel: profile.homeRegion,
        lat: Math.round(profile.homeLat * 100) / 100,
        lng: Math.round(profile.homeLng * 100) / 100,
        createdAt: now,
        updatedAt: now,
        isDefault: false,
      })
      setWord('')
      setMeaning('')
      setWordError('')
      setMeaningError('')
      setCreateOpen(false)
      success('Pin added', 'Your regionalism is now on the map.')
    } catch {
      error('Could not add pin', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid h-full md:grid-cols-[360px_minmax(0,1fr)]">
      <div className="relative h-full md:order-2">
        <MapContainer
          center={[profile.homeLat, profile.homeLng]}
          zoom={3}
          minZoom={2}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSelection
            selectedPinId={selectedPinId}
            pins={pins}
          />
          {pins.map(({ recordId, data }) => (
            <Marker
              key={recordId}
              position={[data.lat, data.lng]}
              icon={markerIcon(recordId === selectedPinId)}
              eventHandlers={{ click: () => selectPin(recordId) }}
            >
              <Popup>
                <article className="min-w-48 text-foreground">
                  <h2 className="text-base font-semibold">{data.word}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.meaning}</p>
                  <p className="mt-2 text-xs font-medium text-primary">{data.regionLabel}</p>
                </article>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {pinsStatus === 'loading' && (
          <div className="absolute inset-x-0 top-20 z-[1000] mx-auto w-fit rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-lg" aria-live="polite">
            Loading pins...
          </div>
        )}
        {pinsStatus === 'ready' && pins.length === 0 && (
          <div className="absolute left-1/2 top-20 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-border bg-card p-4 text-center shadow-lg">
            <p className="font-medium text-foreground">No regionalisms yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to add a word or phrase.</p>
          </div>
        )}

        <button
          type="button"
          aria-label="Create a pin"
          onClick={() => setCreateOpen(true)}
          className="absolute bottom-20 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl leading-none text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
        >
          +
        </button>
      </div>

      <aside className="hidden min-h-0 border-r border-border bg-card md:order-1 md:flex md:flex-col">
        <div className="border-b border-border p-4">
          <SearchInput
            aria-label="Search pins"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search word or region"
            className="mt-3"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {pinsStatus === 'loading' ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground" aria-live="polite">
              Loading pins...
            </p>
          ) : filteredPins.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {search.trim() ? 'No regionalisms found.' : 'No regionalisms yet. Add the first pin.'}
            </p>
          ) : filteredPins.map(({ recordId, data }) => (
            <button
              key={recordId}
              type="button"
              onClick={() => selectPin(recordId)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                recordId === selectedPinId
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-transparent hover:border-border hover:bg-muted'
              }`}
            >
              <span className="block font-semibold text-foreground">{data.word}</span>
              <span className="mt-1 block text-xs text-primary">{data.regionLabel}</span>
              <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{data.meaning}</span>
            </button>
          ))}
        </div>
      </aside>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} size="sm">
        <Modal.Header>
          <Modal.Title>Add a regionalism</Modal.Title>
          <Modal.Description>
            Your pin will use {profile.homeRegion}.
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <label htmlFor="pin-word" className="mb-1.5 block text-sm font-medium">Word/Phrase</label>
              <Input
                id="pin-word"
                value={word}
                onChange={(event) => {
                  setWord(event.target.value)
                  if (wordError) setWordError('')
                }}
                maxLength={60}
                placeholder="e.g. butty"
                aria-invalid={Boolean(wordError)}
                aria-describedby={wordError ? 'pin-word-error' : undefined}
              />
              <div className="mt-1 flex justify-between text-xs">
                {wordError && <span id="pin-word-error" className="text-destructive">{wordError}</span>}
                <span className="ml-auto text-muted-foreground">{word.length}/60</span>
              </div>
            </div>
            <div>
              <label htmlFor="pin-meaning" className="mb-1.5 block text-sm font-medium">Meaning</label>
              <Textarea
                id="pin-meaning"
                value={meaning}
                onChange={(event) => {
                  setMeaning(event.target.value)
                  if (meaningError) setMeaningError('')
                }}
                maxLength={240}
                placeholder="What does it mean?"
                className="min-h-24"
                aria-invalid={Boolean(meaningError)}
                aria-describedby={meaningError ? 'pin-meaning-error' : undefined}
              />
              <div className="mt-1 flex justify-between text-xs">
                {meaningError && <span id="pin-meaning-error" className="text-destructive">{meaningError}</span>}
                <span className="ml-auto text-muted-foreground">{meaning.length}/240</span>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={savePin}
            disabled={!word.trim() || !meaning.trim() || word.trim().length > 60 || meaning.trim().length > 240}
            loading={saving}
          >
            Add pin
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
