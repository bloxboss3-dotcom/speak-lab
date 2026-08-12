import type { Metadata, Viewport } from 'next'
import { StoreProvider } from '@/lib/store'
import { TabBar } from '@/components/TabBar'
import './globals.css'

/**
 * Next prefixes `_next` assets with `basePath` but leaves metadata paths alone,
 * so a leading slash here points at the domain root rather than at this app.
 * On a sub-path deployment that means no icon and no installable app — the
 * manifest and both icons 404. This is a server component, so the value is read
 * at build time and inlined; it is empty for the server build.
 */
const base = process.env['ROSTRUM_BASE_PATH'] ?? ''

export const metadata: Metadata = {
  title: 'Rostrum',
  description:
    'Learn a technique from a great communicator, use it today, and retrieve it cold days later.',
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: 'Rostrum', statusBarStyle: 'black-translucent' },
  icons: { icon: `${base}/icon.svg`, apple: `${base}/apple-touch-icon.png` },
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
