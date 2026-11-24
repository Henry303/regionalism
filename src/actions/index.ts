import { z } from 'zod/v4'
import { RECORD_NOT_FOUND } from 'deepspace/worker'
import type {
  ActionContext,
  ActionResult,
  GetActionData,
  MutateActionData,
  QueryActionData,
} from 'deepspace/worker'
import type { Env } from '../../worker'
import { SAMPLE_PINS } from '../seed'

export const PUBLIC_PIN_ACTOR = 'regionalism-public-writer'

export interface PinQueryOptions {
  where?: Record<string, unknown>
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  limit?: number
}

export interface PinActionTools {
  create<T extends Record<string, unknown>>(
    data: T,
    recordId?: string,
  ): Promise<ActionResult<MutateActionData>>
  update<T extends Record<string, unknown>>(
    recordId: string,
    data: Partial<T>,
  ): Promise<ActionResult<MutateActionData>>
  remove(recordId: string): Promise<ActionResult<MutateActionData>>
  get<T extends Record<string, unknown>>(
    recordId: string,
  ): Promise<ActionResult<GetActionData<T>>>
  query<T extends Record<string, unknown>>(
    options?: PinQueryOptions,
  ): Promise<ActionResult<QueryActionData<T>>>
}

export type PublicPinActionTools = Pick<PinActionTools, 'create' | 'remove' | 'query'>

type PublicPin = {
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

type PrivatePin = PublicPin & {
  ownerId: string
  publicSynced?: boolean | null
}

export type RegionalismActionContext = Omit<ActionContext<Env>, 'tools'> & {
  tools: PinActionTools
  publicTools: PublicPinActionTools
  role: string
}

type RegionalismAction = (context: RegionalismActionContext) => Promise<ActionResult>

const createPinSchema = z.object({
  word: z.string().trim().min(1).max(60),
  meaning: z.string().trim().min(1).max(240),
  regionLabel: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).strict()

const updatePinSchema = z.object({
  recordId: z.string().min(1).max(128),
  word: z.string().trim().min(1).max(60),
  meaning: z.string().trim().min(1).max(240),
}).strict()

const recordIdSchema = z.object({
  recordId: z.string().min(1).max(128),
}).strict()

function publicPinData(pin: PrivatePin): PublicPin {
  return {
    id: pin.id,
    word: pin.word,
    meaning: pin.meaning,
    regionLabel: pin.regionLabel,
    lat: pin.lat,
    lng: pin.lng,
    createdAt: pin.createdAt,
    updatedAt: pin.updatedAt,
    ...(pin.isDefault === undefined ? {} : { isDefault: pin.isDefault }),
  }
}

function invalidInput(error: z.ZodError): ActionResult {
  return {
    success: false,
    error: error.issues[0]?.message ?? 'Invalid pin data.',
  }
}

function notFound(): ActionResult {
  return { success: false, error: 'Pin not found.' }
}

function canManagePins(role: string): boolean {
  return role === 'member' || role === 'admin'
}

function failedCleanup(primaryError: string, cleanupError: string): ActionResult {
  return {
    success: false,
    error: `${primaryError}; cleanup also failed: ${cleanupError}`,
  }
}

async function removeOwnedPin(
  recordId: string,
  pin: PrivatePin,
  tools: PinActionTools,
  publicTools: PublicPinActionTools,
): Promise<ActionResult> {
  const publicResult = await publicTools.remove(recordId)
  if (!publicResult.success && !publicResult.error.startsWith(RECORD_NOT_FOUND)) {
    return publicResult
  }

  const privateResult = await tools.remove(recordId)
  if (!privateResult.success) {
    if (publicResult.success) {
      const rollback = await publicTools.create(
        { ...publicPinData(pin) },
        recordId,
      )
      if (!rollback.success) return failedCleanup(privateResult.error, rollback.error)
    }
    return privateResult
  }

  return { success: true, data: { recordId, deleted: true } }
}

export const actions: Record<string, RegionalismAction> = {
  'pins.create': async ({ userId, role, params, tools, publicTools }) => {
    if (!canManagePins(role)) {
      return { success: false, error: 'This account cannot create pins.' }
    }
    const parsed = createPinSchema.safeParse(params)
    if (!parsed.success) return invalidInput(parsed.error)

    const now = Date.now()
    const recordId = crypto.randomUUID()
    const pin: PrivatePin = {
      id: recordId,
      ownerId: userId,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
      isDefault: false,
      publicSynced: true,
    }

    const privateResult = await tools.create({ ...pin }, recordId)
    if (!privateResult.success) return privateResult

    const publicResult = await publicTools.create(
      { ...publicPinData(pin) },
      recordId,
    )
    if (!publicResult.success) {
      const cleanupErrors: string[] = []
      const publicCleanup = await publicTools.remove(recordId)
      if (
        !publicCleanup.success &&
        !publicCleanup.error.startsWith(RECORD_NOT_FOUND)
      ) {
        cleanupErrors.push(publicCleanup.error)
      }
      const privateCleanup = await tools.remove(recordId)
      if (!privateCleanup.success) cleanupErrors.push(privateCleanup.error)
      return cleanupErrors.length === 0
        ? publicResult
        : failedCleanup(publicResult.error, cleanupErrors.join('; '))
    }

    return { success: true, data: { recordId } }
  },

  'pins.update': async ({ userId, role, params, tools, publicTools }) => {
    if (!canManagePins(role)) {
      return { success: false, error: 'This account cannot update pins.' }
    }
    const parsed = updatePinSchema.safeParse(params)
    if (!parsed.success) return invalidInput(parsed.error)

    const existing = await tools.get<PrivatePin>(parsed.data.recordId)
    if (!existing.success) {
      return existing.error.startsWith(RECORD_NOT_FOUND) ? notFound() : existing
    }
    if (existing.data.record.data.ownerId !== userId) return notFound()

    const previous = existing.data.record.data
    const patch = {
      word: parsed.data.word,
      meaning: parsed.data.meaning,
      updatedAt: Date.now(),
      publicSynced: true,
    }
    const privateResult = await tools.update(parsed.data.recordId, patch)
    if (!privateResult.success) return privateResult

    const publicResult = await publicTools.create(
      { ...publicPinData({ ...previous, ...patch }) },
      parsed.data.recordId,
    )
    if (!publicResult.success) {
      const privateRollback = await tools.update(parsed.data.recordId, {
        word: previous.word,
        meaning: previous.meaning,
        updatedAt: previous.updatedAt,
        publicSynced: previous.publicSynced ?? null,
      })
      const publicRollback = await publicTools.create(
        { ...publicPinData(previous) },
        parsed.data.recordId,
      )
      const rollbackErrors = [
        ...(privateRollback.success ? [] : [privateRollback.error]),
        ...(publicRollback.success ? [] : [publicRollback.error]),
      ]
      return rollbackErrors.length === 0
        ? publicResult
        : failedCleanup(publicResult.error, rollbackErrors.join('; '))
    }

    return { success: true, data: { recordId: parsed.data.recordId } }
  },

  'pins.delete': async ({ userId, role, params, tools, publicTools }) => {
    if (!canManagePins(role)) {
      return { success: false, error: 'This account cannot delete pins.' }
    }
    const parsed = recordIdSchema.safeParse(params)
    if (!parsed.success) return invalidInput(parsed.error)

    const existing = await tools.get<PrivatePin>(parsed.data.recordId)
    if (!existing.success) {
      return existing.error.startsWith(RECORD_NOT_FOUND)
        ? { success: true, data: { recordId: parsed.data.recordId, deleted: false } }
        : existing
    }
    if (existing.data.record.data.ownerId !== userId) return notFound()

    return removeOwnedPin(
      parsed.data.recordId,
      existing.data.record.data,
      tools,
      publicTools,
    )
  },

  'pins.deleteOwned': async ({ userId, role, tools, publicTools }) => {
    if (!canManagePins(role)) {
      return { success: false, error: 'This account cannot delete pins.' }
    }
    let deleted = 0
    while (true) {
      const ownedPins = await tools.query<PrivatePin>({
        where: { ownerId: userId },
        limit: 500,
      })
      if (!ownedPins.success) return ownedPins
      if (ownedPins.data.records.length === 0) break

      for (const pin of ownedPins.data.records) {
        const result = await removeOwnedPin(
          pin.recordId,
          pin.data,
          tools,
          publicTools,
        )
        if (!result.success) return result
        deleted += 1
      }
    }
    return { success: true, data: { deleted } }
  },

  'pins.migratePublic': async ({ userId, role, tools, publicTools }) => {
    if (!canManagePins(role)) {
      return { success: false, error: 'This account cannot synchronize pins.' }
    }
    const existing = await tools.query<PrivatePin>({
      where: { ownerId: userId },
      limit: 500,
    })
    if (!existing.success) return existing
    if (existing.data.count > existing.data.records.length) {
      return {
        success: false,
        error: 'Pin migration is limited to 500 records. Contact the app owner.',
      }
    }

    let migrated = 0
    for (const record of existing.data.records) {
      if (record.data.publicSynced === true) continue
      const created = await publicTools.create(
        { ...publicPinData(record.data) },
        record.recordId,
      )
      if (!created.success) return created
      const marked = await tools.update(record.recordId, { publicSynced: true })
      if (!marked.success) return marked
      migrated += 1
    }

    const publicRecords = await publicTools.query({ limit: 1 })
    if (!publicRecords.success) return publicRecords

    if (existing.data.records.length === 0 && publicRecords.data.count === 0) {
      const now = Date.now()
      for (const [index, sample] of SAMPLE_PINS.entries()) {
        const recordId = `sample-${index + 1}`
        const created = await publicTools.create(
          {
            id: recordId,
            ...sample,
            createdAt: now,
            updatedAt: now,
            isDefault: true,
          },
          recordId,
        )
        if (!created.success) return created
      }
    }

    return {
      success: true,
      data: { migrated },
    }
  },
}
