'use client'

import { useParams } from 'next/navigation'
import { PortalShell } from '@/components/layout/portal-shell'
import { RouteContent } from '@/components/layout/route-content'
import { ComponentGallery } from '@/components/design/component-gallery'

export default function PortalRoutePage() {
  const params = useParams<{ slug: string[] }>()
  const path = `/${params.slug.join('/')}`
  if (path === '/design') return <PortalShell path={path}><ComponentGallery /></PortalShell>
  return <PortalShell path={path}><RouteContent path={path} /></PortalShell>
}
