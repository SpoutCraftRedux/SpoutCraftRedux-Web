import { z } from 'zod'
import { or } from '@prisma/orm-postgres/orm-client'

const Body = z.object({
  server: z.string().max(60),
  days: z.number().int().min(1).max(365),
  startsAt: z.string().datetime().optional(),
  note: z.string().max(500).optional()
})

// Staff grant: free promotion, scheduled into the next free slot unless a start is given
export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readValid(event, Body)
  const orm = useDb().orm.public
  const server = await orm.Server.where(s => or(s.id.eq(body.server), s.slug.eq(body.server))).first()
  if (!server) fail(404, 'Server not found', 'server')
  const id = newId('pro')
  await orm.Promotion.createAndCount([{ id, serverId: server.id, days: body.days, source: 'staff', buyerId: staff.id, note: body.note ?? null }])
  const row = await schedulePaid(id, body.startsAt ? { startsAt: new Date(body.startsAt) } : {})
  setResponseStatus(event, 201)
  return promotionJson(row!, { id: server.id, slug: server.slug, name: server.name })
})
