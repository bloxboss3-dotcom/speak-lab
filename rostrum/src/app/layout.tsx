import type { Metadata, Viewport } from 'next'
import { StoreProvider } from '@/lib/store'
import { TabBar } from '@/components/TabBar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rostrum',
  description:
    'Learn a technique from a great communicator, use it today, and retrieve it cold days later.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Rostrum', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="shell">
            {children}
            <TabBar />
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
