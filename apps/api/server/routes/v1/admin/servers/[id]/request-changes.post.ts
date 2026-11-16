import { z } from 'zod'

const Body = z.object({ note: z.string().trim().min(3).max(1000) })

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const { note } = await readValid(event, Body)
  const { row } = await ownedById(getRouterParam(event, 'id')!)
  const update: ServerUpdate = { reviewNote: note, updatedAt: new Date() }
  if (row.state === 'pending') update.state = 'changes_requested'
  else if (!row.pendingRevision) fail(400, 'Nothing to review')
  await updateServer(row.id, update)
  await notifyOwner(row, 'changes', note)
  return (await ownedById(row.id)).json
})
