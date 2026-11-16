// Usage: NITRO_DATABASE_URL=postgres://... node scripts/make-staff.mjs <username>
import postgres from '@prisma/orm-postgres/runtime'
import { contractFromJson } from '@prisma/orm-postgres/static'
import contractJson from '../prisma/contract.json' with { type: 'json' }

const username = process.argv[2]
const url = process.env.NITRO_DATABASE_URL
if (!username || !url) {
  console.error('Usage: NITRO_DATABASE_URL=postgres://... node scripts/make-staff.mjs <username>')
  process.exit(1)
}

const db = postgres({ contract: contractFromJson(contractJson), url })
const users = db.orm.public.User
const where = users.where((u, { fns }) => fns.eq(fns.raw`lower(${u.username})`.returns('pg/text@1'), username.toLowerCase()))
const user = await where.first()
if (!user) {
  console.error(`No user named ${username}; they need to register first`)
  process.exit(1)
}
await users.where({ id: user.id }).update({ role: 'staff' })
console.log(`${user.username} is now staff`)
process.exit(0)
