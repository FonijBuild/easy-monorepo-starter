import type { Access, AccessArgs, TypedUser } from 'payload'

type AuthCollection = 'admins' | 'users'

type RequestUser = (TypedUser & { collection: AuthCollection }) | null | undefined

const asRequestUser = (user: TypedUser | null | undefined): RequestUser => user as RequestUser

export const isAdmin = (
  user: TypedUser | null | undefined,
): user is TypedUser & { collection: 'admins' } => {
  return asRequestUser(user)?.collection === 'admins'
}

export const isAppUser = (
  user: TypedUser | null | undefined,
): user is TypedUser & { collection: 'users' } => {
  return asRequestUser(user)?.collection === 'users'
}

export const adminOnly = ({ req }: AccessArgs): boolean => {
  return isAdmin(req.user)
}

export const selfOrAdmin: Access = ({ req }) => {
  const user = asRequestUser(req.user)

  if (user?.collection === 'admins') {
    return true
  }

  if (user?.collection !== 'users') {
    return false
  }

  return {
    id: {
      equals: user.id,
    },
  }
}
