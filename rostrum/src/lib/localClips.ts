/**
 * Recordings you add yourself.
 *
 * The shipped clips are limited to US federal recordings, because anything in
 * `public/` is published the moment this deploys — the site is reachable by
 * anyone with the URL. That rules out most of the Hall, and it is a limit on
 * what this repository may distribute, not on what you may listen to.
 *
 * So audio you add lives here instead: in IndexedDB, in your browser, on your
 * device. It is never uploaded, never committed, and never leaves with the
 * build. Copying a recording you already have for your own study is your own
 * business; publishing it would have been the app's.
 *
 * IndexedDB rather than localStorage because these are binary blobs of a few
 * megabytes, which localStorage cannot hold.
 */

const DB_NAME = 'rostrum-clips'
const STORE = 'clips'
const VERSION = 1

export interface LocalClip {
  id: string
  techniqueId: string
  /** What the learner called it — usually the speaker and occasion. */
  label: string
  /** Their own note on what to listen for. Optional. */
  note: string
  blob: Blob
  addedAt: string
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('techniqueId', 'techniqueId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** True when this browser can store audio at all. Private modes sometimes cannot. */
export function clipStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function clipsFor(techniqueId: string): Promise<LocalClip[]> {
  if (!clipStorageAvailable()) return []
  const db = await open()
  try {
    return await new Promise<LocalClip[]>((resolve, reject) => {
      const index = db.transaction(STORE, 'readonly').objectStore(STORE).index('techniqueId')
      const request = index.getAll(techniqueId)
      request.onsuccess = () => resolve((request.result as LocalClip[]) ?? [])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function addClip(input: {
  techniqueId: string
  label: string
  note: string
  blob: Blob
}): Promise<LocalClip> {
  const clip: LocalClip = {
    // Date.now plus a random suffix: two files added in the same millisecond
    // would otherwise overwrite each other.
    id: `lc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    techniqueId: input.techniqueId,
    label: input.label,
    note: input.note,
    blob: input.blob,
    addedAt: new Date().toISOString(),
  }
  const db = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).add(clip)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
  return clip
}

export async function removeClip(id: string): Promise<void> {
  const db = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      transaction.objectStore(STORE).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

/** Total bytes stored, so the Profile screen can say what is on the device. */
export async function storedBytes(): Promise<{ count: number; bytes: number }> {
  if (!clipStorageAvailable()) return { count: 0, bytes: 0 }
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
      request.onsuccess = () => {
        const all = (request.result as LocalClip[]) ?? []
        resolve({
          count: all.length,
          bytes: all.reduce((sum, clip) => sum + (clip.blob?.size ?? 0), 0),
        })
      }
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
