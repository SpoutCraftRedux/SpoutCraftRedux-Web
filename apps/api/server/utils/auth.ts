import type { H3Event } from 'h3'
import { hash, verify } from '@node-rs/argon2'

const COOKIE = 'scr_session'
const MAX_AGE = 30 * 24 * 3600

export const hashPassword = (password: string) => hash(password)
export const checkPassword = (stored: string, password: string) => verify(stored, password).catch(() => false)

// Host-only (no Domain) so other subdomains never receive it
function cookieOptions(event: H3Event) {
  const host = getRequestHost(event, { xForwardedHost: true }).split(':')[0]!
  return {
    httpOnly: true,
    secure: !host.startsWith('localhost'),
    sameSite: 'lax' as const,
    path: '/'
  }
}

// Usernames are unique case-insensitively (users_username_lower)
export function findByUsername(username: string) {
  return useDb().orm.public.User.where((u, { fns }) => fns.eq(fns.raw`lower(${u.username})`.returns('pg/text@1'), username.toLowerCase())).first()
}

export async function startSession(event: H3Event, userId: string) {
  const id = randomString(40)
  await useDb().orm.public.Session.createAndCount([{ id, userId, expiresAt: new Date(Date.now() + MAX_AGE * 1000) }])
  setCookie(event, COOKIE, id, { ...cookieOptions(event), maxAge: MAX_AGE })
}

export async function endSession(event: H3Event) {
  const id = getCookie(event, COOKIE)
  if (id) await useDb().orm.public.Session.where({ id }).deleteAndCount()
  deleteCookie(event, COOKIE, cookieOptions(event))
}

export async function currentUser(event: H3Event): Promise<UserRow | null> {
  if (event.context.user !== undefined) return event.context.user
  const id = getCookie(event, COOKIE)
  let user: UserRow | null = null
  if (id) {
    const session = await useDb().orm.public.Session.where({ id }).where(s => s.expiresAt.gt(new Date())).include('user').first()
    user = session?.user ?? null
    if (user?.banned) user = null
  }
  event.context.user = user
  return user
}

export async function requireUser(event: H3Event) {
  const user = await currentUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Sign in first' })
  return user
}

export async function requireStaff(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'staff') throw createError({ statusCode: 403, message: 'Staff only' })
  return user
}

export function publicUser(user: UserRow, withEmail: boolean) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    ...(withEmail ? { email: user.email, banned: user.banned } : {}),
    createdAt: user.createdAt.toISOString()
  }
}
