import { randomUUID } from "node:crypto"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { ensureAuthenticationKeys } from "./authentication-keys"

describe("authentication key failures", () => {
  it("never surfaces credential-bearing query errors", async () => {
    const db = {
      execute() {
        throw new Error("query contained test-secret-value")
      },
    }
    await expect(
      ensureAuthenticationKeys(db, { JWT_SECRET_KEY: "test-secret-value" }),
    ).rejects.toThrow("Could not initialize authentication keys in the deployment database.")
  })
})

const DATABASE_URL = process.env.TEST_DATABASE_URL

describe.skipIf(!DATABASE_URL && !process.env.CI)(
  "database authentication key initialization",
  () => {
    const schema = `authentication_${randomUUID().replace(/-/g, "")}`
    let admin: pg.Client
    let pool: pg.Pool
    let db: NodePgDatabase
    beforeAll(async () => {
      admin = new pg.Client({ connectionString: DATABASE_URL })
      await admin.connect()
      await admin.query(`create schema ${schema}`)
      await admin.query(
        `create table ${schema}.site_config (like public.site_config including all)`,
      )
      pool = new pg.Pool({
        connectionString: DATABASE_URL,
        options: `-c search_path=${schema},public`,
      })
      db = drizzle(pool)
    })
    beforeEach(async () => {
      await pool.query("truncate site_config")
    })
    afterAll(async () => {
      await pool?.end()
      if (!admin) return
      await admin.query(`drop schema if exists ${schema} cascade`)
      await admin.end()
    })
    async function stored() {
      const { rows } = await pool.query(
        "select data from site_config where section = 'authentication'",
      )
      expect(rows).toHaveLength(1)
      return rows[0].data as { signingKey: string; hashKey: string }
    }

    it("imports existing environment keys exactly without changing their bytes", async () => {
      await ensureAuthenticationKeys(db, {
        JWT_SECRET_KEY: " existing-signing-key ",
        HASH_SECRET_KEY: "existing-hash-key",
      })
      expect(await stored()).toEqual({
        signingKey: " existing-signing-key ",
        hashKey: "existing-hash-key",
      })
    })

    it("generates two independent 256-bit keys when environment keys are absent", async () => {
      await ensureAuthenticationKeys(db, { JWT_SECRET_KEY: " ", HASH_SECRET_KEY: "" })
      const keys = await stored()
      expect(keys.signingKey).toMatch(/^[0-9a-f]{64}$/)
      expect(keys.hashKey).toMatch(/^[0-9a-f]{64}$/)
      expect(keys.signingKey).not.toBe(keys.hashKey)
    })

    it("generates only the missing key and never overwrites saved keys on subsequent deploys", async () => {
      await ensureAuthenticationKeys(db, { JWT_SECRET_KEY: "imported-signing" })
      const keys = await stored()
      expect(keys.signingKey).toBe("imported-signing")
      expect(keys.hashKey).toMatch(/^[0-9a-f]{64}$/)
      await ensureAuthenticationKeys(db, {
        JWT_SECRET_KEY: "changed-env-signing",
        HASH_SECRET_KEY: "changed-env-hash",
      })
      expect(await stored()).toEqual(keys)
      await ensureAuthenticationKeys(db, {})
      expect(await stored()).toEqual(keys)
    })

    it("fills a partially initialized row while preserving its existing key", async () => {
      await pool.query("insert into site_config (section, data) values ('authentication', $1)", [
        JSON.stringify({ signingKey: "preserve-signing", hashKey: "" }),
      ])
      await ensureAuthenticationKeys(db, {
        JWT_SECRET_KEY: "ignore-signing",
        HASH_SECRET_KEY: "import-hash",
      })
      expect(await stored()).toEqual({ signingKey: "preserve-signing", hashKey: "import-hash" })
    })

    it("keeps one matching pair when multiple processes initialize concurrently", async () => {
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          ensureAuthenticationKeys(db, {
            JWT_SECRET_KEY: `signing-${index}`,
            HASH_SECRET_KEY: `hash-${index}`,
          }),
        ),
      )
      const keys = await stored()
      expect(keys.signingKey).toMatch(/^signing-[0-7]$/)
      expect(keys.hashKey).toBe(keys.signingKey.replace("signing-", "hash-"))
    })
  },
)
