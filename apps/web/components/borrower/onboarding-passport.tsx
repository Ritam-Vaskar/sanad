'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, KeyRound, LockKeyhole, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import type { Borrower, Credential, Issuer, Mandate } from '@/types'
import { issueCredential, revokeCredential } from '@/lib/api'
import { useDemoStore } from '@/lib/store/demo-store'
import { useWallet } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { BorrowerEmpty, ProofCard, ValueChip } from './borrower-ui'
import { t, type BorrowerLanguage } from './copy'

export function OnboardingFlow() {
  const router = useRouter()
  const wallet = useWallet()
  const created = useDemoStore((state) => state.walletCreated)
  const walletVault = useDemoStore((state) => state.walletVault)
  const language = useDemoStore((state) => state.language)
  const [step, setStep] = useState(0)
  const [justCreated, setJustCreated] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [walletError, setWalletError] = useState('')
  const [walletBusy, setWalletBusy] = useState(false)
  const strength = passphrase.length < 6 ? 0 : passphrase.length < 10 ? 1 : /[A-Z]/.test(passphrase) && /[0-9]/.test(passphrase) ? 3 : 2
  const shortId = useDemoStore((state) => {
    const borrower = state.borrowers.find((item) => item.id === state.personaId)
    return borrower ? `SND-${borrower.ethAddress.slice(2, 6).toUpperCase()}-${borrower.ethAddress.slice(-4).toUpperCase()}` : 'SND-7C65-976F'
  })

  async function createSanadId() {
    if (walletBusy || passphrase.trim().length < 6 || confirm !== passphrase) return
    setWalletBusy(true)
    setWalletError('')
    try {
      await wallet.createWallet(passphrase)
      setJustCreated(true)
      setStep(2)
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Could not create your secure wallet.')
    } finally {
      setWalletBusy(false)
    }
  }

  async function unlockSanadId() {
    if (walletBusy) return
    setWalletBusy(true)
    setWalletError('')
    try {
      await wallet.unlock(passphrase)
      router.push('/borrower')
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Could not unlock this wallet.')
    } finally {
      setWalletBusy(false)
    }
  }

  if (created && !justCreated) {
    return <div className="mx-auto grid min-h-[60vh] max-w-sm content-center gap-5"><div className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><KeyRound /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Sanad ID</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Unlock your passport</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your passphrase to decrypt your local signing key.</p></div><Card><CardContent className="grid gap-3 pt-5"><label htmlFor="returning-passphrase" className="text-xs font-medium">{t(language, 'Passphrase')}</label><Input id="returning-passphrase" type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="At least 6 characters" />{walletError && <p role="alert" className="text-xs text-danger">{walletError}</p>}<Button disabled={passphrase.trim().length < 6 || walletBusy} onClick={() => void unlockSanadId()}>{walletBusy ? 'Unlocking…' : 'Unlock Sanad ID'}<ArrowRight data-icon="inline-end" /></Button></CardContent></Card></div>
  }

  return <div className="mx-auto grid min-h-[62vh] max-w-sm content-center gap-5"><div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${step >= item ? 'bg-primary' : 'bg-muted'}`} />)}</div>{step === 0 && <><div className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Borrower passport</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Your credit, in your hands.</h1><div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground"><p>Your Sanad ID keeps verified proofs together.</p><p>You choose what to share, with whom and for how long.</p><p>Lenders can verify a claim without seeing your documents.</p></div></div><Button onClick={() => setStep(1)}>Create your Sanad ID<ArrowRight data-icon="inline-end" /></Button></>}{step === 1 && <><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Step 2 · Keep your key safe</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{t(language, 'Create your Sanad ID')}</h1><p className="mt-2 text-xs leading-5 text-muted-foreground">A signing key is generated in your browser and encrypted with this passphrase.</p></div><Card><CardContent className="grid gap-3 pt-5"><label htmlFor="new-passphrase" className="text-xs font-medium">{t(language, 'Passphrase')}</label><Input id="new-passphrase" type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="At least 6 characters" /><div className="flex gap-1" aria-label={`Passphrase strength ${strength} of 3`}>{[1, 2, 3].map((level) => <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? level === 1 ? 'bg-danger' : level === 2 ? 'bg-accent' : 'bg-success' : 'bg-muted'}`} />)}</div><p className="text-[10px] text-muted-foreground">{strength === 0 ? 'Use at least 6 characters.' : strength === 1 ? 'Keep going for a stronger passphrase.' : strength === 2 ? 'Good passphrase.' : 'Strong passphrase.'}</p><label htmlFor="confirm-passphrase" className="mt-1 text-xs font-medium">{t(language, 'Confirm passphrase')}</label><Input id="confirm-passphrase" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it again" /><div className="rounded-xl border border-warning/20 bg-warning/[0.05] p-3 text-xs leading-5 text-warning">{t(language, 'Only you hold this key. Sanad cannot recover it.')}</div>{walletError && <p role="alert" className="text-xs text-danger">{walletError}</p>}<Button disabled={passphrase.trim().length < 6 || confirm !== passphrase || walletBusy} onClick={() => void createSanadId()}>{walletBusy ? 'Creating secure wallet…' : 'Create my Sanad ID'}<ArrowRight data-icon="inline-end" /></Button></CardContent></Card></>}{step === 2 && <><div className="grid size-14 place-items-center rounded-2xl border border-success/20 bg-success/10 text-success"><Sparkles /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">You&apos;re ready</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Your Sanad ID is ready.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Your passport is private until you choose to share a proof.</p></div><div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/[0.06] p-4"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sanad ID</p><p className="mt-1 font-mono text-sm font-semibold text-primary">{shortId}</p></div><Badge variant="outline" className="rounded-full border-success/25 bg-success/10 text-success">Ready</Badge></div><Button onClick={() => router.push('/borrower')}>Open your passport<ArrowRight data-icon="inline-end" /></Button></>}</div>
}

export function BorrowerPassport({ borrower, credentials, issuers, mandates, language, showTechnical }: { borrower: Borrower; credentials: Credential[]; issuers: Issuer[]; mandates: Mandate[]; language: BorrowerLanguage; showTechnical: boolean }) {
  const router = useRouter()
  const verified = credentials.filter((item) => item.status === 'active')
  const activePermissions = mandates.filter((item) => item.status === 'active')
  const hasIncomeProof = credentials.some((item) => item.type === 'GigIncomeCredential' && item.status === 'active')
  const renew = async () => {
    try {
      await issueCredential('KycCredential', borrower.id)
      toast.success('Your identity proof is renewed.')
    } catch {
      toast.error('Could not renew your proof. Try again.')
    }
  }
  async function revoke(id: string) {
    try {
      await revokeCredential(id)
      toast.success('Proof revoked. The issuer status list and Explorer have been updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke this proof.')
    }
  }
  const firstName = borrower.name.split(' ')[0]
  return <div className="grid gap-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t(language, 'Good morning')}, {firstName}</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Your passport</h1><p className="mt-1 text-xs text-muted-foreground">{borrower.occupation} · {borrower.city.split(',')[0]}</p></div><ValueChip tone="success"><span className="size-1.5 rounded-full bg-current" />{t(language, 'Wallet ready')}</ValueChip></div><div className="grid grid-cols-2 gap-2"><Card className="border-primary/15 bg-primary/[0.04]"><CardHeader className="pb-1"><CardTitle className="text-[10px] font-medium text-muted-foreground">{t(language, 'Verified proofs')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight">{verified.length}</p></CardContent></Card><Card className="border-chain/20 bg-chain/[0.04]"><CardHeader className="pb-1"><CardTitle className="text-[10px] font-medium text-muted-foreground">{t(language, 'Active permissions')}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight">{activePermissions.length}</p></CardContent></Card></div><div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck /></span><div><p className="text-xs font-medium">Sanad ID</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">SND-{borrower.ethAddress.slice(2, 6).toUpperCase()}-{borrower.ethAddress.slice(-4).toUpperCase()}</p></div></div><Badge variant="outline" className="rounded-full border-success/25 bg-success/10 text-[9px] text-success">Private</Badge></div><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{t(language, 'Your verified proofs')}</h2><Button nativeButton={false} role="link" render={<Link href="/borrower/add-credential" />} size="xs" variant="ghost">{t(language, 'Add proof')}<Plus data-icon="inline-end" /></Button></div>{borrower.id === 'priya-nair' && !hasIncomeProof && <div className="rounded-2xl border border-warning/20 bg-warning/[0.05] p-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-warning/10 text-warning"><LockKeyhole /></span><div><h3 className="text-xs font-semibold">{t(language, 'Not available yet')}</h3><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Verified income is below the ₹25,000 threshold, so the issuer cannot create this proof.</p></div></div></div>}{credentials.length === 0 ? <BorrowerEmpty title="No verified proofs yet" description="Add a proof from a trusted issuer when you are ready." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/add-credential" />} size="sm">{t(language, 'Add proof')}</Button>} /> : <div className="grid gap-3">{credentials.map((credential) => <ProofCard key={credential.id} credential={credential} issuerName={issuers.find((issuer) => issuer.id === credential.issuerId)?.name ?? 'Trusted issuer'} language={language} showTechnical={showTechnical} onRenew={renew} onRevoke={() => revoke(credential.id)} />)}</div>}<Button variant="outline" className="w-full" onClick={() => router.push('/borrower/assistant')}>Ask your loan assistant<ArrowRight data-icon="inline-end" /></Button></div>
}
