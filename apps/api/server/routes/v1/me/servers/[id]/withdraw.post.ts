export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  const saved = await useDb().orm.public.Server.where({ id: row.id, state: 'pending' })
    .update({ state: 'draft', submittedAt: null, updatedAt: new Date() })
  if (!saved) fail(400, 'This listing is not waiting for review')
  return (await ownedById(row.id)).json
})
