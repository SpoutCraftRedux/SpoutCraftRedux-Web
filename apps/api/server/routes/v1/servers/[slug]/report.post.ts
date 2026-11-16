import { z } from 'zod'

const Body = z.object({
  reason: z.enum(['offline', 'wrong_info', 'inappropriate', 'scam', 'other']),
  details: z.string().trim().max(1000).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(event, 'report', 10, 3600_000, user.id)
  const body = await readValid(event, Body)
  const orm = useDb().orm.public
  const server = await orm.Server.select('id').where({ slug: getRouterParam(event, 'slug')!, state: 'approved' }).first()
  if (!server) throw createError({ statusCode: 404, message: 'Server not found' })
  await orm.Report.createAndCount([{ id: newId('rep'), serverId: server.id, reporterId: user.id, reason: body.reason, details: body.details || null }])
  setResponseStatus(event, 201)
  return { ok: true }
})
