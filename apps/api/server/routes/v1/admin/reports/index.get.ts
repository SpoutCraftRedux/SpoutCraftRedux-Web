import { z } from 'zod'

const Query = z.object({ status: z.enum(['open', 'resolved']).default('open') })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { status } = queryValid(event, Query)
  const rows = await useDb().orm.public.Report.where({ status })
    .include('server', s => s.select('id', 'slug', 'name'))
    .include('reporter', u => u.select('username'))
    .orderBy(r => r.createdAt.desc()).limit(200).all()
  return {
    reports: rows.map(r => ({
      id: r.id,
      server: { id: r.server!.id, slug: r.server!.slug, name: r.server!.name },
      reason: r.reason,
      details: r.details,
      reporter: { username: r.reporter!.username },
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null
    }))
  }
})
