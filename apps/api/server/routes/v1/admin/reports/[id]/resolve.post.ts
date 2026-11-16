import { z } from 'zod'

const Body = z.object({ resolution: z.string().trim().min(1).max(1000) })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { resolution } = await readValid(event, Body)
  const row = await useDb().orm.public.Report.where({ id: getRouterParam(event, 'id')! })
    .update({ status: 'resolved', resolution, resolvedAt: new Date() })
  if (!row) throw createError({ statusCode: 404, message: 'Report not found' })
  return { id: row.id, status: row.status, resolution: row.resolution, resolvedAt: row.resolvedAt?.toISOString() }
})
