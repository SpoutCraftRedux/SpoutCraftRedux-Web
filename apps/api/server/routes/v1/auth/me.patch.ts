import { z } from 'zod'

const Body = z.object({ email: fields.email, currentPassword: z.string().max(200).optional(), newPassword: fields.password.optional() })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValid(event, Body)
  const users = useDb().orm.public.User
  const update: Partial<Omit<UserRow, 'id'>> = {}
  if (body.email !== undefined) update.email = body.email
  if (body.newPassword) {
    if (!body.currentPassword || !(await checkPassword(user.passwordHash, body.currentPassword))) fail(400, 'Current password is wrong', 'currentPassword')
    update.passwordHash = await hashPassword(body.newPassword)
    const current = getCookie(event, 'scr_session') ?? ''
    await useDb().orm.public.Session.where({ userId: user.id }).where(s => s.id.neq(current)).deleteAndCount()
  }
  if (!Object.keys(update).length) return { user: publicUser(user, true) }
  const row = await users.where({ id: user.id }).update(update)
  return { user: publicUser(row!, true) }
})
