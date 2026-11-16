export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  await useDb().orm.public.Server.where({ id: row.id }).deleteAndCount()
  setResponseStatus(event, 204)
  return null
})
