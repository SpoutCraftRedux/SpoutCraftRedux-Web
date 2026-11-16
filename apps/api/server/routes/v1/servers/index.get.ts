import { z } from 'zod'
import { and, or, type Condition } from '@prisma/orm-postgres/orm-client'

const Query = z.object({
  q: z.string().max(100).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  version: z.string().max(40).optional(),
  online: z.enum(['true', 'false']).optional(),
  sort: z.enum(['featured', 'players', 'newest', 'name']).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24)
})

const escapeLike = (s: string) => s.replace(/[%_\\]/g, m => `\\${m}`)

export default defineEventHandler(async (event) => {
  rateLimit(event, 'public', 120, 60_000)
  const query = queryValid(event, Query)
  const tags = query.tag ? [query.tag].flat() : []
  const servers = useDb().orm.public.Server.where((s) => {
    const where: Condition[] = [
      s.state.eq('approved'),
      s.listed.eq(true),
      s.status.some(st => st.version.ilike(`${SPOUTCRAFTREDUX_PREFIX}%`)),
      s.owner.some(u => u.banned.eq(false))
    ]
    if (query.q) {
      const like = `%${escapeLike(query.q)}%`
      where.push(or(s.name.ilike(like), s.shortDescription.ilike(like), s.address.ilike(like)))
    }
    for (const tag of tags) where.push(s.tags.some(t => t.tagSlug.eq(tag)))
    if (query.version) where.push(s.status.some(st => st.version.ilike(`%${escapeLike(query.version!)}%`)))
    if (query.online === 'true') where.push(s.status.some(st => st.online.eq(true)))
    return and(...where)
  })

  const sorted = {
    featured: () => servers.orderBy([
      (s, { fns }) => fns.raw`exists (select 1 from promotions pr where pr.server_id = ${s.id} and pr.status = 'paid' and pr.starts_at <= now() and pr.ends_at > now())::int`.returns('pg/int4@1').desc(),
      (s, { fns }) => fns.raw`${s.featured}::int`.returns('pg/int4@1').desc(),
      s => s.sortWeight.desc(),
      s => s.status.playersOnline.desc({ nulls: 'last' }),
      s => s.name.asc()
    ]),
    players: () => servers.orderBy([s => s.status.playersOnline.desc({ nulls: 'last' }), s => s.name.asc()]),
    newest: () => servers.orderBy(s => s.approvedAt.desc()),
    name: () => servers.orderBy((s, { fns }) => fns.raw`lower(${s.name})`.returns('pg/text@1').asc())
  }[query.sort]()

  const [rows, count] = await Promise.all([
    sorted.limit(query.perPage).offset((query.page - 1) * query.perPage).all(),
    servers.aggregate(a => ({ n: a.count() }))
  ])
  const extras = await loadExtras(rows.map(r => r.id))
  return {
    servers: rows.map(r => summaryJson(r, extras.tags.get(r.id) ?? [], extras.status.get(r.id), extras.promoted.has(r.id))),
    page: query.page,
    perPage: query.perPage,
    total: count.n
  }
})
