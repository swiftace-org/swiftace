import { eq } from "drizzle-orm"

import { accounts, db } from "@/lib/schema.server"

export async function updateAccountName(accountId: number, name: string): Promise<void> {
  await db.update(accounts).set({ name }).where(eq(accounts.id, accountId))
}
