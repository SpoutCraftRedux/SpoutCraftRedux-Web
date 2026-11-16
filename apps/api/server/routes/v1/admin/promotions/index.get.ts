export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const rows = await useDb().orm.public.Promotion.where(p => p.status.neq('pending_payment'))
    .include('server', s => s.select('id', 'slug', 'name'))
    .orderBy(p => p.createdAt.desc()).limit(200).all()
  return { slots: await promoSlots(), promotions: rows.map(({ server, ...promo }) => promotionJson(promo, server!)) }
})
