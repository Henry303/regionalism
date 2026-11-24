import { describe, expect, it, vi } from 'vitest'
import type {
  ActionResult,
  GetActionData,
  QueryActionData,
} from 'deepspace/worker'
import { actions } from './index'
import type { PinActionTools } from './index'
import { pinsSchema } from '../schemas/pins-schema'
import { publicPinsSchema } from '../schemas/public-pins-schema'
import type { Env } from '../../worker'

const privatePin = {
  id: 'pin-1',
  ownerId: 'owner-1',
  word: 'butty',
  meaning: 'A sandwich.',
  regionLabel: 'South Wales, UK',
  lat: 51.48,
  lng: -3.18,
  createdAt: 1,
  updatedAt: 1,
  isDefault: false,
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function makeTools(pinData: Record<string, unknown> = privatePin): PinActionTools {
  let recordExists = true
  const record = {
    recordId: 'pin-1',
    data: pinData,
    createdBy: 'owner-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  }

  return {
    create: async (_data, recordId) =>
      success({ recordId: recordId ?? 'created-pin' }),
    update: async (recordId) => success({ recordId }),
    remove: async (recordId) => {
      recordExists = false
      return success({ recordId })
    },
    get: async <T extends Record<string, unknown>>(
      recordId: string,
    ): Promise<ActionResult<GetActionData<T>>> =>
      success({ record: { ...record, recordId, data: pinData as T } }),
    query: async <T extends Record<string, unknown>>(
      options?: { where?: Record<string, unknown>; limit?: number },
    ): Promise<ActionResult<QueryActionData<T>>> => {
      const matches = recordExists && Object.entries(options?.where ?? {}).every(
        ([key, value]) => pinData[key] === value,
      )
        ? [{ ...record, data: pinData as T }]
        : []
      return success({
        records: matches.slice(0, options?.limit ?? 500),
        count: matches.length,
      })
    },
  }
}

function actionContext(
  userId: string,
  role: string,
  params: Record<string, unknown>,
  tools: PinActionTools,
  publicTools: PinActionTools,
) {
  return {
    userId,
    role,
    params,
    tools,
    publicTools,
    env: {} as Env,
    callerJwt: 'test-token',
  }
}

describe('pin data access', () => {
  it('keeps owner identifiers private while allowing public pin reads', () => {
    expect(pinsSchema.permissions.viewer?.read).toBe(false)
    expect(pinsSchema.permissions.member?.read).toBe('own')
    expect(pinsSchema.permissions.member?.create).toBe(false)
    expect(publicPinsSchema.columns.some(({ name }) => name === 'ownerId')).toBe(false)
    expect(publicPinsSchema.permissions.viewer?.read).toBe(true)
  })

  it('writes only an owner-free projection for public reads', async () => {
    const tools = makeTools()
    const publicTools = makeTools()
    const privateCreate = vi.spyOn(tools, 'create')
    const publicCreate = vi.spyOn(publicTools, 'create')

    const result = await actions['pins.create'](actionContext(
      'owner-1',
      'member',
      {
        word: 'butty',
        meaning: 'A sandwich.',
        regionLabel: 'South Wales, UK',
        lat: 51.48,
        lng: -3.18,
      },
      tools,
      publicTools,
    ))

    expect(result.success).toBe(true)
    expect(privateCreate).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1' }),
      expect.any(String),
    )
    expect(publicCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ ownerId: 'owner-1' }),
      expect.any(String),
    )
  })

  it("does not let a caller update another user's pin", async () => {
    const tools = makeTools()
    const publicTools = makeTools()
    const privateUpdate = vi.spyOn(tools, 'update')
    const publicCreate = vi.spyOn(publicTools, 'create')

    const result = await actions['pins.update'](actionContext(
      'attacker-1',
      'member',
      { recordId: 'pin-1', word: 'changed', meaning: 'Changed meaning.' },
      tools,
      publicTools,
    ))

    expect(result).toEqual({ success: false, error: 'Pin not found.' })
    expect(privateUpdate).not.toHaveBeenCalled()
    expect(publicCreate).not.toHaveBeenCalled()
  })

  it('projects legacy pins once without exposing owner metadata', async () => {
    const tools = makeTools()
    const publicTools = makeTools()
    const privateUpdate = vi.spyOn(tools, 'update')
    const privateQuery = vi.spyOn(tools, 'query')
    const publicCreate = vi.spyOn(publicTools, 'create')

    const result = await actions['pins.migratePublic'](actionContext(
      'owner-1',
      'member',
      {},
      tools,
      publicTools,
    ))

    expect(result).toEqual({ success: true, data: { migrated: 1 } })
    expect(publicCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ ownerId: 'owner-1' }),
      'pin-1',
    )
    expect(privateQuery).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      limit: 500,
    })
    expect(privateUpdate).toHaveBeenCalledWith('pin-1', { publicSynced: true })
  })

  it("does not migrate another account's pins", async () => {
    const tools = makeTools()
    const publicTools = makeTools()
    const privateUpdate = vi.spyOn(tools, 'update')
    const publicCreate = vi.spyOn(publicTools, 'create')

    const result = await actions['pins.migratePublic'](actionContext(
      'member-1',
      'member',
      {},
      tools,
      publicTools,
    ))

    expect(result).toEqual({ success: true, data: { migrated: 0 } })
    expect(publicCreate).not.toHaveBeenCalled()
    expect(privateUpdate).not.toHaveBeenCalled()
  })

  it('does not allow viewer-role accounts to migrate pins', async () => {
    const tools = makeTools()
    const publicTools = makeTools()
    const privateQuery = vi.spyOn(tools, 'query')
    const publicCreate = vi.spyOn(publicTools, 'create')

    const result = await actions['pins.migratePublic'](actionContext(
      'viewer-1',
      'viewer',
      {},
      tools,
      publicTools,
    ))

    expect(result).toEqual({
      success: false,
      error: 'This account cannot synchronize pins.',
    })
    expect(privateQuery).not.toHaveBeenCalled()
    expect(publicCreate).not.toHaveBeenCalled()
  })

  it('does not allow viewer-role accounts to create pins', async () => {
    const tools = makeTools()
    const privateCreate = vi.spyOn(tools, 'create')

    const result = await actions['pins.create'](actionContext(
      'viewer-1',
      'viewer',
      {
        word: 'butty',
        meaning: 'A sandwich.',
        regionLabel: 'South Wales, UK',
        lat: 51.48,
        lng: -3.18,
      },
      tools,
      makeTools(),
    ))

    expect(result.success).toBe(false)
    expect(privateCreate).not.toHaveBeenCalled()
  })

  it('deletes default pins owned by the account during account cleanup', async () => {
    const tools = makeTools({ ...privatePin, isDefault: true })
    const publicTools = makeTools()
    const privateRemove = vi.spyOn(tools, 'remove')
    const publicRemove = vi.spyOn(publicTools, 'remove')
    const privateQuery = vi.spyOn(tools, 'query')

    const result = await actions['pins.deleteOwned'](actionContext(
      'owner-1',
      'member',
      {},
      tools,
      publicTools,
    ))

    expect(result).toEqual({ success: true, data: { deleted: 1 } })
    expect(privateQuery).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      limit: 500,
    })
    expect(privateRemove).toHaveBeenCalledWith('pin-1')
    expect(publicRemove).toHaveBeenCalledWith('pin-1')
  })
})
