'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Blocks, Check, FileCheck2, Network, ShieldAlert, ShieldCheck, Users } from 'lucide-react'
import { getAdminOverview, getAuditLog, verifyAuditChain } from '@/lib/api/mock-api'
import { useDemoStore } from '@/lib/store/demo-store'
import type { Issuer, Lender } from '@/types'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, ConfirmDialog } from '@/components/shared/overlays'
import { EmptyState, HashChip, StatCard, StatusBadge } from '@/components/shared/primitives'
import { PortalHeading, PortalQueryState, SectionHeading } from './portal-shared'

export function AdminPortal({ path }: { path: string }) {
  const section = path.split('/')[2] ?? 'overview'
  const issuers = useDemoStore((state) => state.issuers)
  const lenders = useDemoStore((state) => state.lenders)
  const admin = useDemoStore((state) => state.admin)
  const auditLog = useDemoStore((state) => state.auditLog)
  const credentials = useDemoStore((state) => state.credentials)
  const query = useQuery({ queryKey: ['trust-admin', section], queryFn: async () => {
    const [overview, audit] = await Promise.all([getAdminOverview(), getAuditLog()])
    return { overview, audit }
  } })
  const heading = section === 'registry' ? 'Trusted registry' : section === 'queue' ? 'Registration review queue' : section === 'audit' ? 'Audit chain' : 'Trust network overview'
  return <PortalQueryState loading={query.isLoading} error={query.isError} retry={() => { void query.refetch() }}>
    <div className="grid gap-6"><PortalHeading eyebrow="Sanad Trust Administration" title={heading} description="Govern issuer and lender trust status, review network registrations, and verify the event audit chain." />
      {section === 'registry' ? <RegistryPage issuers={issuers} lenders={lenders} credentials={credentials} schemaVersions={admin.schemaVersions} /> : section === 'queue' ? <QueuePage issuers={issuers} lenders={lenders} queue={admin.queue} /> : section === 'audit' ? <AuditPage auditLog={query.data?.audit ?? auditLog} /> : <AdminOverview issuers={issuers} lenders={lenders} admin={admin} />}
    </div>
  </PortalQueryState>
}

function AdminOverview({ issuers, lenders, admin }: { issuers: Issuer[]; lenders: Lender[]; admin: ReturnType<typeof useDemoStore.getState>['admin'] }) {
  const [height, setHeight] = useState(admin.chainStatus.blockHeight)
  const pending = admin.queue.issuers.length + admin.queue.lenders.length
  const activeIssuers = issuers.filter((issuer) => issuer.registryStatus === 'active').length
  const activeLenders = lenders.filter((lender) => lender.status === 'active').length
  const usedPercent = admin.chainStatus.dailyTransactionsUsed / admin.chainStatus.dailyTransactionCap * 100
  useEffect(() => {
    const interval = window.setInterval(() => setHeight((current) => current + 1), 6000)
    return () => window.clearInterval(interval)
  }, [])
  return <div className="grid gap-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Active issuers" value={activeIssuers} icon={<BadgeCheck />} /><StatCard label="Active lenders" value={activeLenders} icon={<Users />} accent="teal" /><StatCard label="Pending approvals" value={pending} icon={<FileCheck2 />} accent="amber" /><StatCard label="Indexed events" value={admin.chainStatus.dailyTransactionsUsed} icon={<Blocks />} accent="violet" /></div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Network className="size-4 text-primary" />Chain status</CardTitle><CardDescription>Relayer health and transaction capacity on the trust network.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="grid grid-cols-2 gap-3"><Metric label="Network" value={admin.chainStatus.network} /><Metric label="Block height" value={height.toLocaleString('en-IN')} /><Metric label="Relayer balance" value={`${admin.chainStatus.relayerBalance.toFixed(3)} ETH`} /><Metric label="Daily cap" value={`${admin.chainStatus.dailyTransactionsUsed} / ${admin.chainStatus.dailyTransactionCap}`} /></div><div className="grid gap-2"><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Daily transaction capacity</span><span>{Math.round(usedPercent)}%</span></div><Progress value={usedPercent} aria-label="Daily transaction cap used" /></div><div className="flex items-center gap-2 text-xs text-success"><span className="size-2 rounded-full bg-success" />Relayer operational · testnet</div></CardContent></Card><Card><CardHeader><SectionHeading title="Recent governance events" description="Registry actions are shared with Explorer." /></CardHeader><CardContent className="grid gap-3">{admin.governanceLog.length ? admin.governanceLog.slice(0, 6).map((event) => <div key={event.id} className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"><div><p className="text-xs font-medium">{event.action}</p><p className="mt-1 text-[10px] text-muted-foreground">{event.actor} · {formatDate(event.timestamp, 'd MMM, HH:mm')}</p></div><StatusBadge status="onchain" label="Logged" /></div>) : <EmptyState title="No governance events" description="Approvals and registry changes will be recorded here." />}</CardContent></Card></div></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 bg-background/45 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-medium" title={value}>{value}</p></div>
}

function RegistryPage({ issuers, lenders, credentials, schemaVersions }: { issuers: Issuer[]; lenders: Lender[]; credentials: ReturnType<typeof useDemoStore.getState>['credentials']; schemaVersions: ReturnType<typeof useDemoStore.getState>['admin']['schemaVersions'] }) {
  return <Card><CardHeader><SectionHeading title="Registry participants and schemas" description="Activate or deactivate entities. Deactivation is confirmed with an impact preview before the registry is changed." /></CardHeader><CardContent><Tabs defaultValue="issuers"><TabsList><TabsTrigger value="issuers">Issuers</TabsTrigger><TabsTrigger value="lenders">Lenders</TabsTrigger><TabsTrigger value="schemas">Schemas</TabsTrigger></TabsList><TabsContent value="issuers" className="mt-4"><IssuerRegistryTable issuers={issuers} credentials={credentials} /></TabsContent><TabsContent value="lenders" className="mt-4"><LenderRegistryTable lenders={lenders} /></TabsContent><TabsContent value="schemas" className="mt-4"><SchemaRegistryTable schemas={schemaVersions} /></TabsContent></Tabs></CardContent></Card>
}

function IssuerRegistryTable({ issuers, credentials }: { issuers: Issuer[]; credentials: ReturnType<typeof useDemoStore.getState>['credentials'] }) {
  const updateStatus = useDemoStore((state) => state.updateIssuerStatus)
  const rows = issuers.map((issuer) => ({ id: issuer.id, name: issuer.name, did: issuer.did, credentialCount: credentials.filter((credential) => credential.issuerId === issuer.id && credential.status === 'active').length, status: issuer.registryStatus, issuer }))
  const columns = [{ key: 'name' as const, label: 'Issuer' }, { key: 'did' as const, label: 'DID' }, { key: 'credentialCount' as const, label: 'Active credentials' }, { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }, { key: 'id' as const, label: 'Registry action', render: (row: (typeof rows)[number]) => row.status === 'active' ? <ConfirmDialogButton title={`Deactivate ${row.name}?`} impact={`${row.credentialCount} active credentials from this issuer will fail verification. Any lender checking proofs from this key will reject them until the issuer is reactivated.`} onConfirm={() => { updateStatus(row.id, 'suspended'); toast.success(`${row.name} deactivated · governance event published`) }} /> : row.status === 'suspended' ? <Button size="xs" variant="outline" onClick={() => { updateStatus(row.id, 'active'); toast.success(`${row.name} reactivated`) }}>Activate</Button> : <span className="text-xs text-muted-foreground">Pending review</span> }]
  return <DataTable rows={rows} columns={columns} pageSize={10} />
}

function LenderRegistryTable({ lenders }: { lenders: Lender[] }) {
  const updateStatus = useDemoStore((state) => state.updateLenderStatus)
  const rows = lenders.map((lender) => ({ id: lender.id, name: lender.name, did: lender.did, status: lender.status, lender }))
  const columns = [{ key: 'name' as const, label: 'Lender' }, { key: 'did' as const, label: 'DID' }, { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }, { key: 'id' as const, label: 'Registry action', render: (row: (typeof rows)[number]) => row.status === 'active' ? <ConfirmDialogButton title={`Deactivate ${row.name}?`} impact="New requests to this lender will fail registry verification. Existing accepted offers are not changed by this mock action." onConfirm={() => { updateStatus(row.id, 'suspended'); toast.success(`${row.name} deactivated · governance event published`) }} /> : row.status === 'suspended' ? <Button size="xs" variant="outline" onClick={() => { updateStatus(row.id, 'active'); toast.success(`${row.name} reactivated`) }}>Activate</Button> : <span className="text-xs text-muted-foreground">Pending review</span> }]
  return <DataTable rows={rows} columns={columns} pageSize={10} />
}

function ConfirmDialogButton({ title, impact, onConfirm }: { title: string; impact: string; onConfirm: () => void }) {
  return <ConfirmDialog title={title} description={`${impact} This action updates the shared registry and adds a governance event to the Explorer feed.`} confirmLabel="Confirm deactivation" trigger={<Button size="xs" variant="destructive">Deactivate</Button>} onConfirm={onConfirm} />
}

function SchemaRegistryTable({ schemas }: { schemas: ReturnType<typeof useDemoStore.getState>['admin']['schemaVersions'] }) {
  const rows = schemas.map((schema, index) => ({ id: `${schema.name}-${index}`, credential: schema.name, version: schema.version, status: schema.status, verification: 'JSON-LD · Ed25519' }))
  const columns = [{ key: 'credential' as const, label: 'Credential schema' }, { key: 'version' as const, label: 'Version' }, { key: 'verification' as const, label: 'Verification method' }, { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }]
  return <DataTable rows={rows} columns={columns} pageSize={10} />
}

function QueuePage({ issuers, lenders, queue }: { issuers: Issuer[]; lenders: Lender[]; queue: ReturnType<typeof useDemoStore.getState>['admin']['queue'] }) {
  const approve = useDemoStore((state) => state.approveRegistration)
  const reject = useDemoStore((state) => state.rejectRegistration)
  const rows = [
    ...queue.issuers.map((id) => { const issuer = issuers.find((item) => item.id === id); return issuer ? { id, type: 'Issuer', name: issuer.name, did: issuer.did, details: issuer.schemas.join(', '), kind: 'issuer' as const } : null }),
    ...queue.lenders.map((id) => { const lender = lenders.find((item) => item.id === id); return lender ? { id, type: 'Lender', name: lender.name, did: lender.did, details: lender.summary, kind: 'lender' as const } : null }),
  ].filter((row): row is NonNullable<typeof row> => row !== null)
  const columns = [{ key: 'type' as const, label: 'Type' }, { key: 'name' as const, label: 'Applicant' }, { key: 'did' as const, label: 'DID' }, { key: 'details' as const, label: 'Registration details' }, { key: 'id' as const, label: 'Decision', render: (row: (typeof rows)[number]) => <div className="flex items-center gap-2"><Button size="xs" onClick={() => { approve(row.id, row.kind); toast.success(`${row.name} approved and added to the registry`) }}>Approve</Button><RejectRegistrationDialog applicant={row.name} onReject={(reason) => { reject(row.id, row.kind, reason); toast.success(`${row.name} rejected and governance reason logged`) }} /></div> }]
  return <Card><CardHeader><SectionHeading title="Pending registrations" description="Approval changes registry state and publishes a governance event. Rejections require a reason." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function RejectRegistrationDialog({ applicant, onReject }: { applicant: string; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return <ConfirmDialog title={`Reject ${applicant}?`} description="The registration will be removed from the pending queue. The reason will be added to the governance log and Explorer feed." confirmLabel="Reject registration" confirmDisabled={!reason.trim()} trigger={<Button size="xs" variant="outline">Reject</Button>} onConfirm={() => { onReject(reason.trim()); setReason('') }}><label className="grid gap-2 text-xs">Reason for rejection<Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the registry requirement not met" /></label></ConfirmDialog>
}

function AuditPage({ auditLog }: { auditLog: ReturnType<typeof useDemoStore.getState>['auditLog'] }) {
  const admin = useDemoStore((state) => state.admin)
  const setTampering = useDemoStore((state) => state.setSimulateTampering)
  const [verifying, setVerifying] = useState(false)
  const [checked, setChecked] = useState(0)
  const [result, setResult] = useState<{ valid: boolean; brokenIndex: number; entries: number } | null>(null)
  const brokenIndex = admin.simulateTampering ? admin.auditTamperEntry : -1
  async function runVerification() {
    setResult(null)
    setChecked(0)
    setVerifying(true)
    try {
      for (let index = 1; index <= auditLog.length; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 85))
        setChecked(index)
      }
      setResult(await verifyAuditChain())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Audit verification failed.')
    } finally {
      setVerifying(false)
    }
  }
  return <div className="grid gap-4"><Card><CardHeader><SectionHeading title="Audit chain verification" description={`Verify previous-hash links across ${auditLog.length} governance and credit events.`} action={<Button onClick={() => void runVerification()} disabled={verifying}><ShieldCheck data-icon="inline-start" />{verifying ? 'Verifying…' : 'Verify audit chain'}</Button>} /></CardHeader><CardContent className="grid gap-4"><label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="flex items-center gap-2 text-xs"><ShieldAlert className="size-4 text-accent" />Simulate tampering at entry 7</span><Switch checked={admin.simulateTampering} onCheckedChange={(value) => { setTampering(value); setResult(null) }} aria-label="Simulate tampering at audit entry 7" /></label>{verifying && <div className="grid gap-2"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Checking hash links</span><span>{checked} / {auditLog.length}</span></div><Progress value={auditLog.length ? checked / auditLog.length * 100 : 0} aria-label="Audit verification progress" /></div>}{result && <div role="status" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${result.valid ? 'border-success/25 bg-success/[0.06] text-success' : 'border-danger/30 bg-danger/[0.07] text-danger'}`}>{result.valid ? <><Check className="size-4" />Chain intact · all {result.entries} entries verified.</> : <><ShieldAlert className="size-4" />Chain broken · first broken index {result.brokenIndex} of {result.entries}.</>}</div>}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Linked hash sequence</CardTitle><CardDescription>Each entry commits to the previous entry’s hash. Turning on the simulation highlights index 7.</CardDescription></CardHeader><CardContent><ol className="grid gap-0">{auditLog.map((entry, index) => { const isBroken = entry.index === brokenIndex; return <li key={entry.index} className={`relative grid gap-2 border-l pl-5 pb-5 last:pb-0 sm:grid-cols-[56px_1fr] sm:gap-4 ${isBroken ? 'border-danger' : 'border-primary/30'}`}><span className={`absolute -left-[9px] top-0 grid size-4 place-items-center rounded-full border bg-background text-[8px] ${isBroken ? 'border-danger text-danger' : 'border-primary/40 text-primary'}`}>{isBroken ? '!' : index + 1}</span><div className="text-[10px] font-mono text-muted-foreground">Entry {entry.index}</div><div className={`grid gap-3 rounded-xl border p-3 ${isBroken ? 'border-danger/35 bg-danger/[0.07]' : 'border-border bg-background/45'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium">{entry.action}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.actor} · {entry.rule} · {formatDate(entry.timestamp, 'd MMM, HH:mm')}</p></div><StatusBadge status={isBroken ? 'failed' : entry.decision === 'allow' ? 'verified' : 'pending'} label={isBroken ? 'Tampered' : entry.decision} /></div><div className="flex flex-wrap gap-2"><HashChip value={entry.prevHash} label="Prev hash" /><HashChip value={entry.hash} label="Hash" /></div></div></li> })}</ol></CardContent></Card></div>
}
