/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { userProfilesSchema } from './schemas/user-profiles-schema'
import { pinsSchema } from './schemas/pins-schema'
import { publicPinsSchema } from './schemas/public-pins-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  userProfilesSchema,
  pinsSchema,
  publicPinsSchema,
]
