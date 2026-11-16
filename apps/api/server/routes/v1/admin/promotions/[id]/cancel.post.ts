import { z } from 'zod'

const Body = z.object({ note: z.string().max(500).optional() })

// Ends or removes a promotion; refunds themselves are issued in the Tebex panel
export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { note } = await readValid(event, Body)
  const row = await useDb().orm.public.Promotion.where({ id: getRouterParam(event, 'id')! }).update({ status: 'cancelled', note: note ?? null })
  if (!row) fail(404, 'Promotion not found')
  return promotionJson(row)
})
