export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { row } = await ownedById(getRouterParam(event, 'id')!)
  const rev = revisionOf(row)
  const update: ServerUpdate = { reviewNote: null, updatedAt: new Date() }
  if (row.state === 'pending') {
    if (!verifiedFor(row)) fail(400, 'This listing has not been verified for its current address')
    Object.assign(update, { state: 'approved', approvedAt: new Date() })
  } else if (row.state === 'approved' && rev) {
    if (!verifiedFor(row)) fail(400, 'The new address has not been verified yet')
    Object.assign(update, rev, { pendingRevision: null, revisionSubmittedAt: null })
  } else {
    fail(400, 'Nothing to approve')
  }
  const saved = await useDb().orm.public.Server.where({ id: row.id, state: row.state }).update(update)
  if (!saved) fail(409, 'The listing changed during review; reload and try again')
  const live = { ...row, ...(rev ?? {}) }
  await recordStatus(row.id, live.address, live.port).catch(() => null)
  await notifyOwner(row, 'approved')
  return (await ownedById(row.id)).json
})
