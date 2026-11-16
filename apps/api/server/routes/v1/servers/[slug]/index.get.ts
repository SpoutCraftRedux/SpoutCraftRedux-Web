export default defineEventHandler(async (event) => {
  rateLimit(event, 'public', 120, 60_000)
  const slug = getRouterParam(event, 'slug')!
  const r = await useDb().orm.public.Server.where({ slug, state: 'approved', listed: true })
    .where(s => s.owner.some(u => u.banned.eq(false)))
    .include('owner', o => o.select('username')).first()
  if (!r) throw createError({ statusCode: 404, message: 'Server not found' })
  const { owner, ...server } = r
  const { tags, status, promoted } = await loadExtras([server.id])
  if (!isSpoutCraftRedux(status.get(server.id))) throw createError({ statusCode: 404, message: 'Server not found' })
  return serverJson(server, tags.get(server.id) ?? [], status.get(server.id), owner!.username, promoted.has(server.id))
})
