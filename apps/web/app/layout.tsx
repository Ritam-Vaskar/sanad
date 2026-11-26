import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/layout/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-devanagari', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'SANAD — Your credit, your control', template: '%s · SANAD' },
  description: 'A borrower-owned, verifiable credit passport. Share only what a lender needs, with AI agents acting inside your limits.',
  applicationName: 'SANAD',
  keywords: ['verifiable credentials', 'credit passport', 'financial inclusion', 'selective disclosure'],
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A0E14',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${devanagari.variable}`}><body className="antialiased"><Providers>{children}</Providers></body></html>
}
