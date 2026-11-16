import postgres from '@prisma/orm-postgres/runtime'
import { contractFromJson } from '@prisma/orm-postgres/static'
import type { Scalars } from '@prisma/orm-postgres/family-contract/types'
import type { Contract, Models } from '../../prisma/contract.d'
import contractJson from '../../prisma/contract.json' with { type: 'json' }

const contract = contractFromJson<Contract>(contractJson)

function connect(url: string) {
  return postgres({ contract, url, poolOptions: { connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 } })
}

export type Db = ReturnType<typeof connect>
export type UserRow = Scalars<Models.public_User>
export type ServerRow = Scalars<Models.public_Server>
export type StatusRow = Scalars<Models.public_ServerStatus>
export type PromotionRow = Scalars<Models.public_Promotion>

let instance: Db | undefined

export function useDb(): Db {
  if (!instance) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) throw new Error('NITRO_DATABASE_URL is not set; point it at a Postgres database (run `prisma db migrate` against it first)')
    instance = connect(databaseUrl)
  }
  return instance
}
