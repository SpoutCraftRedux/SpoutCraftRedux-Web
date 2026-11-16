import { z } from 'zod'

const Body = z.object({ promoSlots: z.number().int().min(0).max(50).optional() })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readValid(event, Body)
  if (body.promoSlots !== undefined) await setSetting('promoSlots', body.promoSlots)
  return { promoSlots: await promoSlots() }
})
