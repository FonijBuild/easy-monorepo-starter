import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/auth'

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: {
    tokenExpiration: 60 * 60 * 4,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useSessions: true,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Identity',
  },
  access: {
    admin: adminOnly,
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
    unlock: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 100,
    },
  ],
  timestamps: true,
}
