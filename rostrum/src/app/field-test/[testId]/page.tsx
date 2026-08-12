import { FIELD_TESTS } from '@/content/fieldTests'
import FieldTestScreen from './FieldTestScreen'

/**
 * A server shell over the screen.
 *
 * Its only job is `generateStaticParams`: the static export needs the full list
 * of ids at build time, and `generateStaticParams` cannot live in a file marked
 * 'use client'. The screen itself is unchanged and still reads its id from
 * `useParams`, so the server build behaves exactly as it did before.
 */
export function generateStaticParams() {
  return FIELD_TESTS.map((entry) => ({ testId: entry.id }))
}

export default function Page() {
  return <FieldTestScreen />
}
