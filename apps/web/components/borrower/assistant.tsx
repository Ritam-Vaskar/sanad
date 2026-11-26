'use client'

import { useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowRight, Check, ChevronDown, LockKeyhole, Minus, Plus, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Borrower, Lender, Mandate } from '@/types'
import { createMandate, startRun } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useDemoStore } from '@/lib/store/demo-store'
import { useWallet } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Message, MessageAvatar, MessageContent, MessageGroup, MessageHeader } from '@/components/ui/message'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/components/ui/message-scroller'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import { BorrowerEmpty, BorrowerTxChip, ValueChip } from './borrower-ui'
import { HashChip, JsonViewer } from '@/components/shared/primitives'
import { t, type BorrowerLanguage } from './copy'

const starterPrompts = [
  { language: 'en', text: 'I need a loan up to 50,000 for repairing my delivery vehicle. Keep EMI below 3,000.' },
  { language: 'hi', text: 'मुझे अपने डिलीवरी वाहन की मरम्मत के लिए 50,000 तक का ऋण चाहिए। EMI 3,000 से कम रखें।' },
  { language: 'or', text: 'ମୋ ଡେଲିଭରି ଗାଡ଼ି ମରାମତି ପାଇଁ 50,000 ପର୍ଯ୍ୟନ୍ତ ଋଣ ଦରକାର। EMI 3,000 ରୁ କମ୍ ରଖନ୍ତୁ।' },
]
const thinkingSteps = ['Understanding your request', 'Checking safety limits', 'Preparing your permissions']
export type SlipDraft = { amount: number; emi: number; incomeBand: boolean; cashflow: boolean; blocked: string[]; blockedRule?: string; capped: boolean }
type ChatTurn = { id: string; role: 'assistant' | 'borrower'; text?: string; slip?: SlipDraft; rule?: string }

function analyzeRequest(text: string, defaultAmount: number, defaultEmi: number): { slip?: SlipDraft; response: string; rule?: string } {
  if (/ignore\s+(all\s+)?limits|bypass\s+(the\s+)?rules|override\s+(the\s+)?limits/i.test(text)) return { response: 'I can’t override your limits. Your permission stays within Sanad’s protected rules.', rule: 'Prompt-injection blocked' }
  const amountMatches = [...text.matchAll(/(?:₹|rs\.?\s*)?([\d,]{4,})/gi)].map((match) => Number(match[1].replaceAll(',', ''))).filter(Number.isFinite)
  const amount = amountMatches[0] ?? defaultAmount
  const emiMatch = text.match(/(?:emi|monthly installment|monthly payment)[^\d]{0,18}([\d,]{3,})/i)
  const emi = emiMatch ? Number(emiMatch[1].replaceAll(',', '')) : defaultEmi
  const capped = amount > 100000
  if (capped) return { response: 'This request is over the ₹1,00,000 limit. I blocked it; lower the amount and ask again.', rule: 'mandate_amount_cap' }
  const blocked = [
    ...(/\bemployer\b/i.test(text) ? ['Employer name'] : []),
    ...(/bank\s+statements?/i.test(text) ? ['Bank statements'] : []),
  ]
  const response = capped
    ? 'I reduced the requested amount to ₹1,00,000, the maximum limit. You can review or lower it before signing.'
    : blocked.length > 0
      ? 'I can’t share protected details. I blocked the requested item and kept the remaining permission limited.'
      : 'Here is a permission you can review. Nothing is shared until you sign.'
  return { slip: { amount: Math.min(amount, 100000), emi: Math.max(500, Math.min(emi || defaultEmi, 50000)), incomeBand: false, cashflow: true, blocked, blockedRule: blocked.length ? 'Protected by Sanad' : undefined, capped }, response }
}

export function PermissionSlip({ draft, lenders, language, onAdjust, onReview }: { draft: SlipDraft; lenders: Lender[]; language: BorrowerLanguage; onAdjust?: () => void; onReview?: () => void }) {
  const verifiedLenders = lenders.filter((lender) => lender.status === 'active').slice(0, 2)
  const sharedClaims = ['KYC verified', 'Age 21+', 'Income at least ₹25,000 for 6 months', 'Income stability', ...(draft.incomeBand ? ['Income band'] : [])].map((claim) => t(language, claim))
  return <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.06] to-card"><CardHeader className="flex-row items-start justify-between gap-2"><div><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="text-primary" />{t(language, 'Permission slip')}</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">{t(language, 'Nothing happens until you sign.')}</p></div>{onAdjust && <Button size="xs" variant="outline" onClick={onAdjust}>{t(language, 'Adjust')}</Button>}</CardHeader><CardContent className="grid gap-3"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t(language, 'Loan up to')}</p><p className="mt-1 text-sm font-semibold">{formatINR(draft.amount)}</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t(language, 'EMI up to')}</p><p className="mt-1 text-sm font-semibold">{formatINR(draft.emi)}</p></div></div><div><p className="mb-1.5 text-[10px] font-semibold">{t(language, 'Lenders')}</p><div className="flex flex-wrap gap-1.5">{verifiedLenders.length ? verifiedLenders.map((lender) => <ValueChip key={lender.id} tone="violet">{lender.name}</ValueChip>) : <BorrowerEmpty title="No verified lenders" description="There are no lenders in the approved list." />}</div></div><div><p className="mb-1.5 text-[10px] font-semibold text-success">{t(language, 'Will share')}</p><div className="grid gap-1.5">{sharedClaims.map((claim) => <div key={claim} className="flex items-center gap-2 rounded-lg border border-success/15 bg-success/[0.05] px-2.5 py-2 text-[10px]"><Check className="text-success" />{claim}</div>)}</div></div><div><p className="mb-1.5 text-[10px] font-semibold text-danger">{t(language, 'Never shared')}</p><div className="grid grid-cols-2 gap-1.5">{['Employer name', 'Bank statements', 'Exact income'].map((claim) => <div key={claim} className="flex items-center gap-1.5 rounded-lg border border-danger/15 bg-danger/[0.04] px-2 py-2 text-[9px] text-muted-foreground"><LockKeyhole className="shrink-0 text-danger" />{t(language, claim)}</div>)}</div>{draft.blocked.map((claim) => <div key={claim} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/25 bg-danger/[0.08] px-2.5 py-2 text-[10px] text-danger"><span>Blocked: {claim}</span><Badge variant="outline" className="rounded-full border-danger/30 text-[9px] text-danger">{draft.blockedRule}</Badge></div>)}</div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-[10px] font-semibold">{t(language, 'Agent can')}</p><p className="mt-1 text-[10px] text-muted-foreground">{t(language, 'Search lenders · Compare offers')}</p></div><div className="rounded-xl border border-primary/25 bg-primary/[0.08] p-3"><p className="text-[10px] font-semibold text-primary">{t(language, 'Only you can accept a loan')}</p><p className="mt-1 text-[9px] text-muted-foreground">{t(language, 'Your agent can never accept an offer for you.')}</p></div><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{t(language, 'Expires in 24 hours')}</span><span className="inline-flex items-center gap-1"><ArrowDown />{t(language, 'You stay in control')}</span></div>{onReview && <Button className="w-full" onClick={onReview}>{t(language, 'Review and sign')}<ArrowRight data-icon="inline-end" /></Button>}</CardContent></Card>
}

export function AssistantScreen({ borrower, lenders, language }: { borrower: Borrower; lenders: Lender[]; language: BorrowerLanguage }) {
  const router = useRouter()
  const wallet = useWallet()
  const speed = useDemoStore((state) => state.speed)
  const showTechnical = useDemoStore((state) => state.showTechnical)
  const walletVault = useDemoStore((state) => state.walletVault)
  const [turns, setTurns] = useState<ChatTurn[]>([{ id: 'welcome', role: 'assistant', text: t(language, 'Tell me what you need, and I’ll prepare a permission for you to review.') }])
  const [draftText, setDraftText] = useState('')
  const [thinking, setThinking] = useState(-1)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [signing, setSigning] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [slip, setSlip] = useState<SlipDraft | null>(null)
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [starting, setStarting] = useState(false)

  function submit(text = draftText) {
    const message = text.trim()
    if (!message || thinking >= 0 || mandate) return
    const analyzed = analyzeRequest(message, 50000, 3000)
    setDraftText('')
    setTurns((current) => [...current, { id: `borrower-${Date.now()}`, role: 'borrower', text: message }])
    setThinking(0)
    window.setTimeout(() => setThinking(1), 380 / speed)
    window.setTimeout(() => setThinking(2), 760 / speed)
    window.setTimeout(() => {
      setThinking(-1)
      setSlip(analyzed.slip ?? null)
      setTurns((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', text: analyzed.response, slip: analyzed.slip, rule: analyzed.rule }])
    }, 1200 / speed)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      submit()
    }
  }

  function adjustAmount(step: number) {
    setSlip((current) => current ? { ...current, amount: Math.max(10000, Math.min(100000, current.amount + step)), capped: false } : current)
  }

  async function signPermission() {
    if (!slip || !walletVault || passphrase.trim().length < 6 || signing) return
    setSigning(true)
    try {
      await wallet.unlock(passphrase)
      const input = {
        borrowerId: borrower.id,
        purpose: 'vehicle_repair',
        maxAmount: slip.amount,
        maxEmi: slip.emi,
        allowedLenders: lenders.filter((lender) => lender.status === 'active').slice(0, 2).map((lender) => lender.id),
        disclosures: { kycStatus: true, ageOver21: true, incomeThreshold: true, incomeBand: slip.incomeBand, cashflowStability: slip.cashflow, employerName: false, rawStatements: false, exactIncome: false },
        allowAccept: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
      const signature = await wallet.signTypedData('Mandate', input)
      const permission = await createMandate({ ...input, signature })
      setMandate(permission)
      setReviewOpen(false)
      toast.success('Your permission was recorded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your permission.')
    } finally {
      setSigning(false)
    }
  }

  async function watchAgent() {
    if (!mandate || starting) return
    setStarting(true)
    try {
      const run = await startRun(mandate.id)
      router.push(`/borrower/runs/${run.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The agent could not start.')
    } finally {
      setStarting(false)
    }
  }

  if (mandate) return <div className="grid gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-success/10 text-success"><Check /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Signed with Sanad ID</p><h1 className="mt-1 text-xl font-semibold">Your agent permission is ready</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Only the approved lender list and proof categories can be used.</p></div><Card><CardContent className="grid gap-3 pt-5"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Permission ID</span><code className="max-w-[185px] truncate font-mono text-[10px] text-primary">{mandate.id}</code></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Loan limit</span><span className="text-xs font-medium">{formatINR(mandate.maxAmount)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">EMI limit</span><span className="text-xs font-medium">{formatINR(mandate.maxEmi)}</span></div></CardContent></Card><ValueChip tone="violet"><Check />Signed transaction · {mandate.txHash}</ValueChip><BorrowerTxChip value={mandate.txHash} />{showTechnical && <div className="grid gap-3"><div className="grid gap-2 sm:grid-cols-2"><HashChip value={mandate.mandateHash} label="Mandate hash" /><HashChip value={mandate.txHash} label="Transaction hash" /></div><Card><CardHeader className="pb-2"><CardTitle className="text-xs">{t(language, 'Mock typed-data payload')}</CardTitle><p className="text-[10px] leading-4 text-muted-foreground">Signed with your local P-256 wallet key. The key remains encrypted at rest.</p></CardHeader><CardContent><JsonViewer value={{ domain: { name: 'SANAD Permission', version: '1', chainId: 84532 }, primaryType: 'SanadPermission', message: { mandateHash: mandate.mandateHash, borrowerId: mandate.borrowerId, purpose: mandate.purpose, maxAmount: mandate.maxAmount, maxEmi: mandate.maxEmi, allowedLenders: mandate.allowedLenders, allowAccept: mandate.allowAccept, expiresAt: mandate.expiresAt } }} /></CardContent></Card></div>}<Button onClick={watchAgent} disabled={starting}>{starting ? 'Starting agent…' : 'Watch your agent'}<ArrowRight data-icon="inline-end" /></Button><Button variant="outline" onClick={() => router.push(`/borrower/mandates/${mandate.id}`)}>Review permission details</Button></div>

  const currentDraft = slip ?? { amount: 50000, emi: 3000, incomeBand: false, cashflow: true, blocked: [], capped: false }
  return <div className="grid min-h-[calc(100vh-11.5rem)] grid-rows-[auto_1fr_auto] gap-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{t(language, 'Sanad assistant')}</p><h1 className="mt-1 text-lg font-semibold">{t(language, 'Plan a safe loan search')}</h1></div><ValueChip tone="success"><Sparkles />{t(language, 'Private by design')}</ValueChip></div><div className="flex min-h-[250px] flex-col overflow-hidden rounded-2xl border border-border bg-surface/60"><MessageScrollerProvider><MessageScroller className="min-h-[250px] flex-1"><MessageScrollerViewport className="px-3 py-4"><MessageScrollerContent className="gap-4">{turns.map((turn) => <MessageScrollerItem key={turn.id}><MessageGroup><Message align={turn.role === 'borrower' ? 'end' : 'start'}><MessageAvatar className={`size-7 text-[9px] font-semibold ${turn.role === 'borrower' ? 'bg-primary/15 text-primary' : 'bg-chain/15 text-chain'}`}>{turn.role === 'borrower' ? 'YOU' : 'S'}</MessageAvatar><MessageContent><MessageHeader>{turn.role === 'borrower' ? borrower.name : t(language, 'Sanad assistant')}</MessageHeader>{turn.text && <Bubble align={turn.role === 'borrower' ? 'end' : 'start'} variant={turn.role === 'borrower' ? 'default' : 'secondary'}><BubbleContent className="text-xs">{turn.text}</BubbleContent></Bubble>}{turn.rule && <Marker className="rounded-lg border border-danger/20 bg-danger/[0.05] px-2 py-1 text-[10px] text-danger"><MarkerIcon><LockKeyhole /></MarkerIcon><MarkerContent>{turn.rule}</MarkerContent></Marker>}{turn.slip && <PermissionSlip draft={turn.slip} lenders={lenders} language={language} onAdjust={turn.id === turns[turns.length - 1]?.id ? () => setAdjustOpen(true) : undefined} onReview={turn.id === turns[turns.length - 1]?.id ? () => setReviewOpen(true) : undefined} />}</MessageContent></Message></MessageGroup></MessageScrollerItem>)}</MessageScrollerContent></MessageScrollerViewport></MessageScroller></MessageScrollerProvider>{thinking >= 0 && <div className="border-t border-border px-3 py-2"><Marker className="text-[10px] text-primary"><MarkerIcon><Sparkles /></MarkerIcon><MarkerContent>{thinkingSteps[thinking]}</MarkerContent></Marker></div>}</div><div className="grid gap-2">{turns.length === 1 && <div className="flex gap-2 overflow-x-auto pb-1">{starterPrompts.map((prompt) => <button key={prompt.language} type="button" onClick={() => submit(prompt.text)} className="max-w-[88%] shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-left text-[10px] leading-4 text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{prompt.text}</button>)}</div>}<label htmlFor="assistant-message" className="sr-only">{t(language, 'Describe what you need')}</label><div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2"><textarea id="assistant-message" rows={2} value={draftText} onChange={(event) => setDraftText(event.target.value)} onKeyDown={handleKeyDown} placeholder={`${t(language, 'Describe what you need')}…`} className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/50" disabled={thinking >= 0} /><Button size="icon" aria-label={t(language, 'Send')} onClick={() => submit()} disabled={!draftText.trim() || thinking >= 0}><Send /></Button></div></div><Sheet open={adjustOpen} onOpenChange={setAdjustOpen}><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-border bg-surface pb-[calc(5rem+env(safe-area-inset-bottom))]"><SheetHeader><SheetTitle>Adjust your permission</SheetTitle><SheetDescription>Set your amount and choose whether to include optional proof categories.</SheetDescription></SheetHeader><div className="mx-auto grid w-full max-w-md gap-4 p-4"><Stepper label="Loan amount" value={currentDraft.amount} display={formatINR(currentDraft.amount)} onDecrease={() => adjustAmount(-10000)} onIncrease={() => adjustAmount(10000)} /><Stepper label="Maximum monthly EMI" value={currentDraft.emi} display={formatINR(currentDraft.emi)} onDecrease={() => setSlip((current) => current ? { ...current, emi: Math.max(500, current.emi - 500) } : current)} onIncrease={() => setSlip((current) => current ? { ...current, emi: Math.min(50000, current.emi + 500) } : current)} /><label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"><span>Share income band</span><Switch checked={currentDraft.incomeBand} onCheckedChange={(checked) => setSlip((current) => current ? { ...current, incomeBand: checked } : current)} aria-label="Share income band" /></label><label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"><span>Share income stability</span><Switch checked={currentDraft.cashflow} onCheckedChange={(checked) => setSlip((current) => current ? { ...current, cashflow: checked } : current)} aria-label="Share income stability" /></label><div className="grid gap-2">{['Employer name', 'Bank statements', 'Exact income'].map((name) => <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-danger/15 bg-danger/[0.04] p-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><LockKeyhole className="text-danger" />{name}</span><button type="button" disabled title="Protected by Sanad" aria-label={`${name} is protected by Sanad`} className="rounded-full border border-danger/20 px-2 py-1 text-[9px] text-danger">Protected by Sanad</button></div>)}</div><Button onClick={() => { setAdjustOpen(false); setReviewOpen(true) }}>Continue to review<ArrowRight data-icon="inline-end" /></Button></div></SheetContent></Sheet><Sheet open={reviewOpen} onOpenChange={setReviewOpen}><SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-surface pb-[calc(5rem+env(safe-area-inset-bottom))]"><SheetHeader><SheetTitle>{t(language, 'Review and sign')}</SheetTitle><SheetDescription>Review the plain-language summary before signing with your Sanad ID.</SheetDescription></SheetHeader><div className="mx-auto grid w-full max-w-md gap-4 p-4"><Card><CardHeader><CardTitle className="text-sm">Your permission</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs"><p>Loan up to <strong>{formatINR(currentDraft.amount)}</strong> with EMI up to <strong>{formatINR(currentDraft.emi)}</strong>.</p><p>Only {lenders.filter((lender) => lender.status === 'active').slice(0, 2).map((lender) => lender.name).join(' and ')} can receive approved proofs.</p><p>Employer name, bank statements and exact income remain locked.</p><p className="text-primary">Only you can accept an offer.</p></CardContent></Card><details open={showTechnical} className="rounded-xl border border-border bg-background/60 p-3"><summary className="flex cursor-pointer items-center justify-between text-xs font-medium">{showTechnical ? 'Typed data JSON' : t(language, 'What you are signing')}<ChevronDown /></summary><pre className="mt-3 max-h-52 overflow-auto rounded-lg bg-background p-3 font-mono text-[9px] leading-4 text-primary/90">{JSON.stringify({ domain: { name: 'SANAD Permission', version: '1', chainId: 84532 }, primaryType: 'SanadPermission', types: { SanadPermission: [{ name: 'borrowerId', type: 'string' }, { name: 'purpose', type: 'string' }, { name: 'maxAmount', type: 'uint256' }, { name: 'maxEmi', type: 'uint256' }, { name: 'allowedLenders', type: 'string[]' }, { name: 'disclosures', type: 'string[]' }, { name: 'expiresInHours', type: 'uint256' }, { name: 'allowAccept', type: 'bool' }] }, message: { borrowerId: borrower.id, purpose: 'vehicle_repair', maxAmount: currentDraft.amount, maxEmi: currentDraft.emi, allowedLenders: lenders.filter((lender) => lender.status === 'active').slice(0, 2).map((lender) => lender.id), disclosures: ['kycStatus', 'ageOver21', 'incomeThreshold', ...(currentDraft.incomeBand ? ['incomeBand'] : []), ...(currentDraft.cashflow ? ['cashflowStability'] : [])], expiresInHours: 24, allowAccept: false } }, null, 2)}</pre></details><label htmlFor="signing-passphrase" className="text-xs font-medium">{t(language, 'Passphrase')}</label><Input id="signing-passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" placeholder="At least 6 characters" /><Button onClick={signPermission} disabled={passphrase.trim().length < 6 || signing}>{signing ? <><Sparkles data-icon="inline-start" />Signing your permission…</> : <>{t(language, 'Sign with Sanad ID')}<ArrowRight data-icon="inline-end" /></>}</Button></div></SheetContent></Sheet></div>
}

function Stepper({ label, value, display, onDecrease, onIncrease }: { label: string; value: number; display: string; onDecrease: () => void; onIncrease: () => void }) {
  return <div className="rounded-xl border border-border bg-background/60 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{display}</p></div><div className="flex items-center gap-1"><Button size="icon-xs" variant="outline" aria-label={`Decrease ${label}`} onClick={onDecrease}><Minus /></Button><span className="sr-only">Value: {value}</span><Button size="icon-xs" variant="outline" aria-label={`Increase ${label}`} onClick={onIncrease}><Plus /></Button></div></div></div>
}
