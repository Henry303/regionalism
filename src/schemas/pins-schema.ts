import type { CollectionSchema } from 'deepspace/schema'

export const pinsSchema: CollectionSchema = {
  name: 'pins',
  ownerField: 'ownerId',
  columns: [
    { name: 'id', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'ownerId', storage: 'text', interpretation: 'plain', required: true, immutable: true, userBound: true },
    { name: 'word', storage: 'text', interpretation: 'plain', required: true, maxLength: 60 },
    { name: 'meaning', storage: 'text', interpretation: 'plain', required: true, maxLength: 240 },
    { name: 'regionLabel', storage: 'text', interpretation: 'plain', required: true, maxLength: 120 },
    { name: 'lat', storage: 'number', interpretation: 'plain', required: true },
    { name: 'lng', storage: 'number', interpretation: 'plain', required: true },
    { name: 'createdAt', storage: 'number', interpretation: 'datetime', required: true },
    { name: 'updatedAt', storage: 'number', interpretation: 'datetime', required: true },
    { name: 'isDefault', storage: 'number', interpretation: { kind: 'boolean' }, required: false },
    { name: 'publicSynced', storage: 'number', interpretation: { kind: 'boolean' }, required: false },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'own',
      create: false,
      update: false,
      delete: false,
    },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
