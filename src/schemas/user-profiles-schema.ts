import type { CollectionSchema } from 'deepspace/schema'

export const userProfilesSchema: CollectionSchema = {
  name: 'user_profiles',
  ownerField: 'id',
  uniqueOn: ['id'],
  columns: [
    { name: 'id', storage: 'text', interpretation: 'plain', required: true, immutable: true, userBound: true },
    { name: 'homeRegion', storage: 'text', interpretation: 'plain', required: true, maxLength: 120 },
    { name: 'homeLat', storage: 'number', interpretation: 'plain', required: true },
    { name: 'homeLng', storage: 'number', interpretation: 'plain', required: true },
    { name: 'createdAt', storage: 'number', interpretation: 'datetime', required: true },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'own',
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['id', 'homeRegion', 'homeLat', 'homeLng', 'createdAt'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
