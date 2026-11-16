export default defineEventHandler(async (event) => {
  rateLimit(event, 'public', 120, 60_000)
  const db = useDb()
  const t = db.sql.public.tags.columns
  const rows = await db.query(db.raw.sql`select t.slug, t.name, (select count(*)::int from server_tags st join servers s on s.id = st.server_id join server_status ss on ss.server_id = s.id where st.tag_slug = t.slug and s.state = 'approved' and s.listed and ss.version like 'SpoutCraft Redux%') as count from tags t order by t.name`
    .returnsRow({ slug: t.slug, name: t.name, count: 'pg/int4@1' }).build())
  return { tags: rows.map(r => ({ slug: r.slug, name: r.name, count: r.count })) }
})
