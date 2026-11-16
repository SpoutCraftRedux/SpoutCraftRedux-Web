import { or } from '@prisma/orm-postgres/orm-client'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const rows = await useDb().orm.public.Server.where(s => or(s.state.eq('pending'), s.pendingRevision.isNotNull()))
    .include('owner', o => o.select('username')).all()
  const { tags, status } = await loadExtras(rows.map(r => r.id))
  const items = rows.map(({ owner, ...server }) => {
    const kind = server.state === 'pending' ? 'new' : 'revision'
    const submittedAt = kind === 'new' ? server.submittedAt : server.revisionSubmittedAt
    return { server: ownedJson(server, tags.get(server.id) ?? [], status.get(server.id), owner!.username), kind, submittedAt: submittedAt?.toISOString() ?? null }
  }).filter(i => i.kind === 'new' || i.server.state === 'approved')
  items.sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))
  return { items }
})
