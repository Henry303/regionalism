import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { SAMPLE_PINS } from '../seed'

export const actions: Record<string, ActionHandler<Env>> = {
  'pins.resetDefaults': async ({ userId, tools }) => {
    const existing = await tools.query('pins', { limit: 500 })
    if (!existing.success || !existing.data) return existing

    let deleted = 0
    for (const record of existing.data.records ?? []) {
      const removed = await tools.remove('pins', record.recordId)
      if (!removed.success) return removed
      deleted++
    }

    const now = Date.now()
    for (const sample of SAMPLE_PINS) {
      const created = await tools.create('pins', {
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
      })
      if (!created.success) return created
    }

    return { success: true, data: { deleted, created: SAMPLE_PINS.length } }
  },
}
