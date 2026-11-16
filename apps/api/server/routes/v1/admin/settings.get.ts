export default defineEventHandler(async (event) => {
  await requireStaff(event)
  return { promoSlots: await promoSlots() }
})
