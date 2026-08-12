import { MASTERS } from '@/content/masters'
import MasterScreen from './MasterScreen'

/**
 * A server shell over the screen.
 *
 * Its only job is `generateStaticParams`: the static export needs the full list
 * of ids at build time, and `generateStaticParams` cannot live in a file marked
 * 'use client'. The screen itself is unchanged and still reads its id from
 * `useParams`, so the server build behaves exactly as it did before.
 */
export function generateStaticParams() {
  return MASTERS.map((entry) => ({ masterId: entry.id }))
}

export default function Page() {
  return <MasterScreen />
}
