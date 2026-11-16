import { z } from 'zod'

const Body = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,24}$/, 'Slug must be 2 to 24 lowercase letters, digits or dashes'), name: z.string().trim().min(2).max(32) })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readValid(event, Body)
  const row = await useDb().orm.public.Tag.upsert({ create: body, update: { name: body.name } })
  setResponseStatus(event, 201)
  return row
})
