import { z } from 'zod'

const Body = z.object({ reason: z.string().trim().min(3).max(1000) })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { reason } = await readValid(event, Body)
  const { row } = await ownedById(getRouterParam(event, 'id')!)
  const update: ServerUpdate = { reviewNote: reason, updatedAt: new Date() }
  if (row.state === 'pending') update.state = 'rejected'
  else if (row.pendingRevision) Object.assign(update, { pendingRevision: null, revisionSubmittedAt: null })
  else fail(400, 'Nothing to reject')
  await updateServer(row.id, update)
  await notifyOwner(row, 'rejected', reason)
  return (await ownedById(row.id)).json
})
