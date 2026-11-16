import { z } from 'zod'

const Body = z.object({ role: z.enum(['user', 'staff']).optional(), banned: z.boolean().optional() })

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readValid(event, Body)
  const id = getRouterParam(event, 'id')!
  if (id === staff.id && (body.role === 'user' || body.banned)) fail(400, 'You cannot demote or ban yourself')
  const orm = useDb().orm.public
  const row = Object.keys(body).length ? await orm.User.where({ id }).update(body) : await orm.User.where({ id }).first()
  if (!row) throw createError({ statusCode: 404, message: 'User not found' })
  if (body.banned) await orm.Session.where({ userId: id }).deleteAndCount()
  return publicUser(row, true)
})
