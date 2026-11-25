import { notFound } from 'next/navigation'
import { PortalShell } from '@/components/layout/portal-shell'
import { RouteContent } from '@/components/layout/route-content'
import { ComponentGallery } from '@/components/design/component-gallery'

const fixedRoutes = new Set([
  '/design', '/borrower', '/borrower/onboarding', '/borrower/add-credential', '/borrower/assistant', '/borrower/activity', '/borrower/profile',
  '/issue', '/credentials', '/status', '/keys', '/activity', '/requests', '/policy', '/issuers', '/offers', '/compliance', '/settings',
  '/admin', '/admin/registry', '/admin/queue', '/admin/audit', '/explorer', '/lab',
])

function isSupportedRoute(path: string) {
  return fixedRoutes.has(path)
    || /^\/borrower\/(?:credentials|mandates|runs|offers)\/[^/]+$/.test(path)
    || /^\/issuer\/[^/]+(?:\/(?:subjects|issue|credentials|status|keys|activity))?$/.test(path)
    || /^\/lender\/[^/]+(?:\/(?:requests(?:\/[^/]+)?|policy|issuers|offers|compliance|settings))?$/.test(path)
    || /^\/requests\/[^/]+$/.test(path)
}

export default async function PortalRoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = `/${slug.join('/')}`
  if (!isSupportedRoute(path)) notFound()
  if (path === '/design') return <PortalShell path={path}><ComponentGallery /></PortalShell>
  return <PortalShell path={path}><RouteContent path={path} /></PortalShell>
}
