import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-background px-5 py-12 text-center">
    <div className="grid max-w-md justify-items-center gap-4">
      <span className="grid size-14 place-items-center rounded-2xl border border-danger/20 bg-danger/[0.06] text-danger"><ShieldAlert /></span>
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">404 · Route not found</p><h1 className="mt-2 text-2xl font-semibold">This SANAD page does not exist</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Check the address or return to the landing page to choose a workspace.</p></div>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}><ArrowLeft data-icon="inline-start" />Back to SANAD</Link>
    </div>
  </main>
}
