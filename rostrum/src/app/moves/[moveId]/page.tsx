import { MOVES } from '@/content/moves'
import MoveScreen from './MoveScreen'

/**
 * A server shell over the screen, so the static export knows every move id at
 * build time. `generateStaticParams` cannot live in a 'use client' file.
 */
export function generateStaticParams() {
  return MOVES.map((entry) => ({ moveId: entry.id }))
}

export default function Page() {
  return <MoveScreen />
}
