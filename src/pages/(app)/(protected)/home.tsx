import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, Input, Modal, Textarea } from '@/components/ui'
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
  const { create: createProfile, ready: profileReady } = useMutations<UserProfile>('user_profiles')
  const { records: pins, status: pinsStatus } = useQuery<Pin>('pins')
  const { create: createPin, ready: pinsReady } = useMutations<Pin>('pins')
  const profile = records[0]?.data
  const [region, setRegion] = useState('')
  const [latitude, setLatitude] = useState(37.87)
  const [longitude, setLongitude] = useState(-122.27)
  const [saving, setSaving] = useState(false)
  const seeded = useRef(false)

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
      }),
    ))
  }, [pinsStatus, pinsReady, pins.length, createPin, userId])

  const rounded = (value: number) => Math.round(value * 100) / 100

  const chooseMapLocation = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    setLongitude(rounded(x * 360 - 180))
    setLatitude(rounded(90 - y * 180))
  }

  const saveProfile = async () => {
    const trimmedRegion = region.trim()
    if (!trimmedRegion || !profileReady) return
    setSaving(true)
    try {
      await createProfile({
        id: userId,
        homeRegion: trimmedRegion,
        homeLat: rounded(latitude),
        homeLng: rounded(longitude),
        createdAt: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (profile) {
    return <RegionMap profile={profile} pins={pins} pinsReady={pinsReady} createPin={createPin} />
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
            <Input
              id="home-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="Berkeley, CA, USA"
              maxLength={120}
            />
          </div>
          <button
            type="button"
            aria-label="Choose approximate location on map"
            className="relative h-52 w-full cursor-crosshair overflow-hidden rounded-lg border border-border bg-[linear-gradient(rgba(204,47,16,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(204,47,16,.08)_1px,transparent_1px)] bg-[size:24px_24px]"
            onClick={chooseMapLocation}
          >
            <span
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white bg-primary shadow"
              style={{
                left: `${((longitude + 180) / 360) * 100}%`,
                top: `${((90 - latitude) / 180) * 100}%`,
              }}
            />
          </button>
          <p className="text-xs text-muted-foreground">
            Approximate point: {rounded(latitude).toFixed(2)}, {rounded(longitude).toFixed(2)}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="w-full sm:w-auto"
          onClick={saveProfile}
          disabled={!region.trim()}
          loading={saving}
        >
          Save location
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function RegionMap({
  profile,
  pins,
  pinsReady,
  createPin,
}: {
  profile: UserProfile
  pins: Array<{ recordId: string; data: Pin }>
  pinsReady: boolean
  createPin: (data: Pin) => Promise<string>
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [saving, setSaving] = useState(false)

  const markerIcon = L.divIcon({
    className: 'regionism-marker',
    html: '<span></span>',
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -28],
  })

  const savePin = async () => {
    const trimmedWord = word.trim()
    const trimmedMeaning = meaning.trim()
    if (!trimmedWord || !trimmedMeaning || !pinsReady) return

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
      })
      setWord('')
      setMeaning('')
      setCreateOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative h-full min-h-[calc(100vh-48px)] md:min-h-0">
      <MapContainer
        center={[profile.homeLat, profile.homeLng]}
        zoom={3}
        minZoom={2}
        scrollWheelZoom
        className="h-full min-h-[calc(100vh-48px)] w-full md:min-h-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map(({ recordId, data }) => (
          <Marker
            key={recordId}
            position={[data.lat, data.lng]}
            icon={markerIcon}
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

      <button
        type="button"
        aria-label="Create a pin"
        onClick={() => setCreateOpen(true)}
        className="absolute bottom-20 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl leading-none text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
      >
        +
      </button>

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
                onChange={(event) => setWord(event.target.value)}
                maxLength={60}
                placeholder="e.g. butty"
              />
            </div>
            <div>
              <label htmlFor="pin-meaning" className="mb-1.5 block text-sm font-medium">Meaning</label>
              <Textarea
                id="pin-meaning"
                value={meaning}
                onChange={(event) => setMeaning(event.target.value)}
                maxLength={240}
                placeholder="What does it mean?"
                className="min-h-24"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={savePin}
            disabled={!word.trim() || !meaning.trim()}
            loading={saving}
          >
            Add pin
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
