import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, useAuth, useMutations, useQuery } from 'deepspace'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, ConfirmModal, Input, Modal, Textarea } from '@/components/ui'
import { LocationField } from '@/components/LocationField'
import { isDefaultSamplePin } from '../../../seed'

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

export default function SettingsPage() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const { records: profiles, status: profileStatus } = useQuery<UserProfile>('user_profiles', {
    where: { id: userId ?? '' },
  })
  const { records: ownedPinRecords, status: pinsStatus } = useQuery<Pin>('pins', {
    where: { ownerId: userId ?? '', isDefault: false },
  })
  const pins = ownedPinRecords.filter(({ data }) => !isDefaultSamplePin(data))
  const profileMutation = useMutations<UserProfile>('user_profiles')
  const pinMutation = useMutations<Pin>('pins')

  const profileEnvelope = profiles[0]
  const profile = profileEnvelope?.data
  const [region, setRegion] = useState('')
  const [latitude, setLatitude] = useState(37.87)
  const [longitude, setLongitude] = useState(-122.27)
  const [savingProfile, setSavingProfile] = useState(false)
  const [locationSelected, setLocationSelected] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [editPinId, setEditPinId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editMeaning, setEditMeaning] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [deletePinId, setDeletePinId] = useState<string | null>(null)
  const [deletingPin, setDeletingPin] = useState(false)

  useEffect(() => {
    if (profile) {
      setRegion(profile.homeRegion)
      setLatitude(profile.homeLat)
      setLongitude(profile.homeLng)
      setLocationSelected(false)
    }
  }, [profile?.homeRegion, profile?.homeLat, profile?.homeLng])

  const rounded = (value: number) => Math.round(value * 100) / 100
  const locationChanged = Boolean(
    profile &&
      (region.trim() !== profile.homeRegion ||
        rounded(latitude) !== rounded(profile.homeLat) ||
        rounded(longitude) !== rounded(profile.homeLng)),
  )

  const saveProfile = async () => {
    if (!profileEnvelope || !region.trim() || !locationSelected || !locationChanged) return
    setSavingProfile(true)
    try {
      await profileMutation.putConfirmed(profileEnvelope.recordId, {
        homeRegion: region.trim(),
        homeLat: rounded(latitude),
        homeLng: rounded(longitude),
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const openEditPin = (recordId: string, pin: Pin) => {
    setEditPinId(recordId)
    setEditWord(pin.word)
    setEditMeaning(pin.meaning)
  }

  const savePin = async () => {
    if (!editPinId || !editWord.trim() || !editMeaning.trim()) return
    setSavingPin(true)
    try {
      await pinMutation.put(editPinId, {
        word: editWord.trim(),
        meaning: editMeaning.trim(),
        updatedAt: Date.now(),
      })
      setEditPinId(null)
    } finally {
      setSavingPin(false)
    }
  }

  const deletePin = async () => {
    if (!deletePinId) return
    setDeletingPin(true)
    try {
      await pinMutation.remove(deletePinId)
      setDeletePinId(null)
    } finally {
      setDeletingPin(false)
    }
  }

  const deleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await Promise.all(pins.map(({ recordId }) => pinMutation.remove(recordId)))
      if (profileEnvelope) await profileMutation.remove(profileEnvelope.recordId)
      await signOut()
      navigate('/', { replace: true })
    } finally {
      setDeletingAccount(false)
      setDeleteAccountOpen(false)
    }
  }

  if (profileStatus === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">General location</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use a general town or region, never a street address.</p>
        {profile ? (
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="profile-region" className="mb-1.5 block text-sm font-medium">Town, State/Region, Country</label>
              <LocationField
                id="profile-region"
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
            <Button
              onClick={saveProfile}
              disabled={!locationSelected || !locationChanged || !region.trim()}
              loading={savingProfile}
            >
              Save location
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No location profile found.</p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">My pins</h2>
        {pinsStatus === 'loading' ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading pins...</p>
        ) : pins.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">You have not created any pins yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pins.map(({ recordId, data }) => (
              <article key={recordId} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{data.word}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{data.meaning}</p>
                    <p className="mt-2 text-xs font-medium text-primary">{data.regionLabel}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditPin(recordId, data)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeletePinId(recordId)}>Delete</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-5">
        <Button variant="secondary" onClick={() => signOut()}>Log out</Button>
        <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)}>Delete account</Button>
      </section>

      <Modal open={editPinId !== null} onClose={() => setEditPinId(null)} size="sm">
        <Modal.Header>
          <Modal.Title>Edit pin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-word" className="mb-1.5 block text-sm font-medium">Word/Phrase</label>
              <Input id="edit-word" value={editWord} onChange={(event) => setEditWord(event.target.value)} maxLength={60} />
            </div>
            <div>
              <label htmlFor="edit-meaning" className="mb-1.5 block text-sm font-medium">Meaning</label>
              <Textarea id="edit-meaning" value={editMeaning} onChange={(event) => setEditMeaning(event.target.value)} maxLength={240} className="min-h-24" />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setEditPinId(null)}>Cancel</Button>
          <Button onClick={savePin} disabled={!editWord.trim() || !editMeaning.trim()} loading={savingPin}>Save pin</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        open={deletePinId !== null}
        onClose={() => setDeletePinId(null)}
        onConfirm={deletePin}
        title="Delete this pin?"
        description="This pin will be removed from the map and list."
        confirmText="Delete pin"
        loading={deletingPin}
      />
      <ConfirmModal
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={deleteAccount}
        title="Delete account data?"
        description="This permanently removes all of your pins and general location profile, then signs you out."
        confirmText="Delete account"
        loading={deletingAccount}
      />
    </div>
  )
}
