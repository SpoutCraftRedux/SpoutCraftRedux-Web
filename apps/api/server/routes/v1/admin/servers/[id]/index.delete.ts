export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { row } = await ownedById(getRouterParam(event, 'id')!)
  await useDb().orm.public.Server.where({ id: row.id }).deleteAndCount()
  setResponseStatus(event, 204)
  return null
})
