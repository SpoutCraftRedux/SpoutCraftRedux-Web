export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  return (await ownedById(row.id)).json
})
