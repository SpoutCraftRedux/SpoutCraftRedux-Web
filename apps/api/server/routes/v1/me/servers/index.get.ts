export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const rows = await useDb().orm.public.Server.where({ ownerId: user.id }).orderBy(s => s.createdAt.desc()).all()
  const { tags, status, promoted } = await loadExtras(rows.map(r => r.id))
  return { servers: rows.map(r => ownedJson(r, tags.get(r.id) ?? [], status.get(r.id), user.username, promoted.has(r.id))) }
})
