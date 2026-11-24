'use client'

import { useQuery } from '@tanstack/react-query'
import { getActivity, getBorrower, getCredentials, getIssuers, getLenders, getMandates } from '@/lib/api/mock-api'
import { useDemoStore } from '@/lib/store/demo-store'
import { BorrowerError, BorrowerSkeleton, BorrowerEmpty } from './borrower-ui'
import { OnboardingFlow, BorrowerPassport } from './onboarding-passport'
import { CredentialDetails, AddProofScreen } from './proof-and-details'
import { AssistantScreen } from './assistant'
import { MandateDetail, RunScreen, OffersScreen } from './mandate-run-offers'
import { ActivityScreen, ProfileScreen } from './activity-profile'
import { t } from './copy'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function BorrowerApp({ path }: { path: string }) {
  const personaId = useDemoStore((state) => state.personaId)
  const walletCreated = useDemoStore((state) => state.walletCreated)
  const walletUnlocked = useDemoStore((state) => state.walletUnlocked)
  const language = useDemoStore((state) => state.language)
  const showTechnical = useDemoStore((state) => state.showTechnical)
  const allCredentials = useDemoStore((state) => state.credentials)
  const allMandates = useDemoStore((state) => state.mandates)
  const query = useQuery({
    queryKey: ['borrower-app', personaId],
    queryFn: async () => {
      const [borrower, credentials, issuers, lenders, mandates, activity] = await Promise.all([
        getBorrower(personaId), getCredentials(personaId), getIssuers(), getLenders(), getMandates(personaId), getActivity(personaId),
      ])
      if (!borrower) throw new Error('This Sanad ID could not be found.')
      return { borrower, credentials, issuers, lenders, mandates, activity }
    },
  })

  if (query.isLoading) return <BorrowerSkeleton rows={3} />
  if (query.isError) return <BorrowerError retry={() => { void query.refetch() }} message={query.error instanceof Error ? query.error.message : undefined} />
  if (path === '/borrower/onboarding') return <OnboardingFlow />
  if (!walletCreated || !walletUnlocked) return <OnboardingFlow />
  if (!query.data?.borrower) return <BorrowerEmpty title="Sanad ID not found" description="Choose a borrower persona in the demo panel and try again." action={<Button nativeButton={false} role="link" render={<Link href="/borrower/profile" />} size="sm">{t(language, 'Profile')}</Button>} />

  const { borrower } = query.data
  const credentials = allCredentials.filter((item) => item.subjectId === personaId)
  const mandates = allMandates.filter((item) => item.borrowerId === personaId)
  const shared = { borrower, credentials, issuers: query.data.issuers, language, showTechnical }
  if (path === '/borrower' || path === '/borrower/') return <BorrowerPassport {...shared} mandates={mandates} />
  if (path === '/borrower/add-credential') return <AddProofScreen borrower={borrower} issuers={query.data.issuers} language={language} />
  if (path === '/borrower/assistant') return <AssistantScreen borrower={borrower} lenders={query.data.lenders} language={language} />
  if (path.startsWith('/borrower/credentials/')) return <CredentialDetails {...shared} credentialId={path.slice('/borrower/credentials/'.length)} />
  if (path.startsWith('/borrower/mandates/')) return <MandateDetail mandateId={path.slice('/borrower/mandates/'.length)} borrower={borrower} lenders={query.data.lenders} language={language} />
  if (path.startsWith('/borrower/runs/')) return <RunScreen runId={path.slice('/borrower/runs/'.length)} lenders={query.data.lenders} language={language} />
  if (path.startsWith('/borrower/offers/')) return <OffersScreen runId={path.slice('/borrower/offers/'.length)} lenders={query.data.lenders} language={language} />
  if (path === '/borrower/activity') return <ActivityScreen borrowerId={personaId} language={language} showTechnical={showTechnical} />
  if (path === '/borrower/profile') return <ProfileScreen borrower={borrower} language={language} showTechnical={showTechnical} />
  return <BorrowerPassport {...shared} mandates={mandates} />
}
