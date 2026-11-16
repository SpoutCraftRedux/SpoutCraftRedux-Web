import { z } from 'zod'
import { all, and, or, type Condition } from '@prisma/orm-postgres/orm-client'

const Query = z.object({
  q: z.string().max(100).optional(),
  state: z.enum(['draft', 'pending', 'approved', 'changes_requested', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24)
})

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = queryValid(event, Query)
  const servers = useDb().orm.public.Server.where((s) => {
    const where: Condition[] = [all()]
    if (query.q) {
      const like = `%${query.q}%`
      where.push(or(s.name.ilike(like), s.address.ilike(like), s.owner.some(u => u.username.ilike(like))))
    }
    if (query.state) where.push(s.state.eq(query.state))
    return and(...where)
  })
  const [rows, count] = await Promise.all([
    servers.include('owner', o => o.select('username')).orderBy(s => s.updatedAt.desc())
      .limit(query.perPage).offset((query.page - 1) * query.perPage).all(),
    servers.aggregate(a => ({ n: a.count() }))
  ])
  const { tags, status } = await loadExtras(rows.map(r => r.id))
  return {
    servers: rows.map(({ owner, ...server }) => ownedJson(server, tags.get(server.id) ?? [], status.get(server.id), owner!.username)),
    page: query.page,
    perPage: query.perPage,
    total: count.n
  }
})
