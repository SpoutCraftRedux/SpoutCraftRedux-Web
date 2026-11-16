export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = editable(await ownServer(user.id, getRouterParam(event, 'id')!))
  await applyListingChanges(row, { iconHash: null })
  return (await ownedById(row.id)).json
})
