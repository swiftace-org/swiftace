// `swiftace make-admin <email>`: makes an existing account an admin. A fresh site has no admin
// and so no way into /manage/config, so sign up at /login first, then run this.
import { sql } from "drizzle-orm"

import { commandDatabaseUrl, withDatabase } from "./migrations.ts"
import { fail } from "./shell.ts"

type Account = { id: number; email: string; username: string; is_admin: boolean }

export async function makeAdmin(email: string | undefined) {
  email = email?.trim()
  if (!email?.includes("@")) fail("Usage: swiftace make-admin <email>")
  const message = await withDatabase(await commandDatabaseUrl(), async (db) => {
    // Case-insensitive, since older accounts kept the address as typed.
    const { rows } = await db.execute<Account>(sql`
      select id, email, username, is_admin from accounts
      where lower(email) = lower(${email}) and deleted is not true
    `)
    const [account] = rows
    if (!account) {
      fail(`No account uses ${email}. Sign up at /login with it first, then run this again.`)
    }
    if (rows.length > 1) {
      const list = rows.map((row) => `  #${row.id} ${row.email} (@${row.username})`).join("\n")
      fail(`${rows.length} accounts use ${email}, so none was changed:\n${list}`)
    }
    if (account.is_admin) return `${account.email} is already an admin.`
    await db.execute(sql`update accounts set is_admin = true where id = ${account.id}`)
    return `${account.email} is now an admin.`
  })
  console.log(message)
}
