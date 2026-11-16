export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  if (row.state === 'approved') fail(400, 'This listing is already live; edits are reviewed automatically')
  if (row.state === 'pending') fail(400, 'This listing is already waiting for review')
  if (!verifiedFor(row)) fail(400, 'Verify the server before submitting it')
  const saved = await useDb().orm.public.Server.where({ id: row.id, state: row.state, address: row.address, port: row.port })
    .update({ state: 'pending', submittedAt: new Date(), updatedAt: new Date() })
  if (!saved) fail(409, 'The listing changed while submitting; reload and try again')
  return (await ownedById(row.id)).json
})
