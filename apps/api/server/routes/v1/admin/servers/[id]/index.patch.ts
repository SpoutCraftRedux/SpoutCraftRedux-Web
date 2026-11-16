import { z } from 'zod'

const Body = z.object({ featured: z.boolean().optional(), sortWeight: z.number().int().min(-1000).max(1000).optional(), listed: z.boolean().optional() })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readValid(event, Body)
  const { row } = await ownedById(getRouterParam(event, 'id')!)
  await updateServer(row.id, { ...body, updatedAt: new Date() })
  return (await ownedById(row.id)).json
})
