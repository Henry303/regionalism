import { useEffect, useRef, useState } from 'react'
import { getAuthToken, useQuery } from 'deepspace'
import { useToast } from '@/components/ui'

export interface PinData {
  id: string
  word: string
  meaning: string
  regionLabel: string
  lat: number
  lng: number
  createdAt: number
  updatedAt: number
  isDefault?: boolean
}

type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

interface CreatePinInput {
  word: string
  meaning: string
  regionLabel: string
  lat: number
  lng: number
}

async function invokePinAction<T>(
  action: 'create' | 'update' | 'delete' | 'deleteOwned' | 'migratePublic',
  params: Record<string, unknown>,
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Your session expired. Please sign in again.')

  const response = await fetch(`/api/actions/pins.${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const result = await response.json() as ActionResponse<T>
  if (!response.ok || !result.success) {
    throw new Error(
      !result.success ? result.error : `Pin action failed (${response.status}).`,
    )
  }
  return result.data
}

export function createPin(input: CreatePinInput): Promise<{ recordId: string }> {
  return invokePinAction('create', { ...input })
}

export function updatePin(
  recordId: string,
  input: Pick<PinData, 'word' | 'meaning'>,
): Promise<{ recordId: string }> {
  return invokePinAction('update', { recordId, ...input })
}

export function deletePin(recordId: string): Promise<{ recordId: string; deleted: boolean }> {
  return invokePinAction('delete', { recordId })
}

export function deleteOwnedPins(): Promise<{ deleted: number }> {
  return invokePinAction('deleteOwned', {})
}

function migratePublicPins(): Promise<{ migrated: number }> {
  return invokePinAction('migratePublic', {})
}

export function usePublicPins() {
  const { records, status } = useQuery<PinData>('public_pins')
  const { error } = useToast()
  const migrationStarted = useRef(false)
  const [migrationComplete, setMigrationComplete] = useState(false)

  useEffect(() => {
    if (status !== 'ready' || migrationStarted.current) return
    migrationStarted.current = true
    void migratePublicPins()
      .then(() => setMigrationComplete(true))
      .catch((cause: unknown) => {
        setMigrationComplete(true)
        error(
          'Could not synchronize pins',
          cause instanceof Error ? cause.message : 'Please try again.',
        )
      })
  }, [error, status])

  return {
    records,
    status: status === 'ready' && !migrationComplete ? 'loading' : status,
  }
}
