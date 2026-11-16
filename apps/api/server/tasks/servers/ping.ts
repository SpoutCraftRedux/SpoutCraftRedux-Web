// Pings every approved, listed server, a few at a time
export default defineTask({
  meta: { name: 'servers:ping', description: 'Ping listed servers and record their status' },
  async run() {
    const rows = await useDb().orm.public.Server.select('id', 'address', 'port').where({ state: 'approved', listed: true }).all()
    let next = 0
    const worker = async () => {
      while (next < rows.length) {
        const row = rows[next++]!
        await withTimeout(recordStatus(row.id, row.address, row.port), 20_000, 'Ping deadline passed')
          .catch(err => console.error('ping failed', row.id, err))
      }
    }
    await Promise.all(Array.from({ length: 8 }, worker))
    return { result: rows.length }
  }
})
