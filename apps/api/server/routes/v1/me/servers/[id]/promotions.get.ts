export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await ownServer(user.id, getRouterParam(event, 'id')!)
  const promos = await useDb().orm.public.Promotion.where({ serverId: row.id }).orderBy(p => p.createdAt.desc()).all()
  return { promotions: promos.filter(p => p.status !== 'pending_payment').map(p => promotionJson(p)) }
})
