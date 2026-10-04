import type { CollectionConfig } from 'payload'

import { adminOnly, isAdmin, isAppUser, selfOrAdmin } from '@/access/auth'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: true,
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useSessions: true,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Identity',
  },
  access: {
    /**
     * Anonymous visitors may register.
     * Admins may manually create users.
     * An already-authenticated normal user cannot
     * create arbitrary additional users.
     */
    create: ({ req }) => {
      if (!req.user) {
        return true
      }
      return isAdmin(req.user)
    },
    read: selfOrAdmin,
    update: selfOrAdmin,
    /**
     * Account deletion deserves a deliberate flow.
     * Don't expose generic DELETE /api/users/:id to normal users.
     */
    delete: adminOnly,
    /**
     * Only admins can manually unlock accounts after repeated failed logins.
     */
    unlock: adminOnly,
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      minLength: 1,
      maxLength: 100,
    },
    /**
     * Override Payload's injected email field so
     * changing identity email is not accidentally
     * exposed through the generic update endpoint.
     *
     * We'll implement a deliberate email-change
     * workflow later.
     */
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      access: {
        create: () => true,
        read: ({ req, doc }) => {
          if (isAdmin(req.user)) {
            return true
          }
          if (!isAppUser(req.user)) {
            return false
          }
          return doc?.id === req.user.id
        },
        update: ({ req }) => {
          return isAdmin(req.user)
        },
      },
    },
  ],
  timestamps: true,
}
