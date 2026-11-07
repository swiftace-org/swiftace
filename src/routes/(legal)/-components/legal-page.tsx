import { Markdown } from "@/components/markdown"
import { Navbar } from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import type { Account } from "@/types/account"

export function LegalPage({ account, markup }: { account: Account | null; markup: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Markdown markup={markup} />
      </main>
    </div>
  )
}

export function LegalPagePending({ account }: { account: Account | null }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <Navbar account={account} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </main>
    </div>
  )
}
