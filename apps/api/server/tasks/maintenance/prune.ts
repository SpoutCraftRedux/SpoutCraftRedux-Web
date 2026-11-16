const DAY = 24 * 3600_000

export default defineTask({
  meta: { name: 'maintenance:prune', description: 'Drop old status checks, expired sessions and unused media' },
  async run() {
    const orm = useDb().orm.public
    await orm.StatusCheck.where(c => c.checkedAt.lt(new Date(Date.now() - 7 * DAY))).deleteAndCount()
    await orm.Session.where(s => s.expiresAt.lt(new Date())).deleteAndCount()
    await orm.Promotion.where({ status: 'pending_payment' }).where(p => p.createdAt.lt(new Date(Date.now() - DAY))).deleteAndCount()
    const media = await pruneMedia(DAY)
    return { result: { media } }
  }
})
