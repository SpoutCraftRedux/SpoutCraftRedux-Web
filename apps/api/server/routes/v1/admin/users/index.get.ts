import { z } from 'zod'

const Query = z.object({ q: z.string().max(100).optional(), page: z.coerce.number().int().min(1).default(1), perPage: z.coerce.number().int().min(1).max(100).default(50) })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = queryValid(event, Query)
  const like = query.q ? `%${query.q}%` : '%'
  const users = useDb().orm.public.User.where(u => u.username.ilike(like))
  const [rows, count] = await Promise.all([
    users.orderBy((u, { fns }) => fns.raw`lower(${u.username})`.returns('pg/text@1').asc()).limit(query.perPage).offset((query.page - 1) * query.perPage).all(),
    users.aggregate(a => ({ n: a.count() }))
  ])
  return { users: rows.map(r => publicUser(r, true)), page: query.page, perPage: query.perPage, total: count.n }
})
