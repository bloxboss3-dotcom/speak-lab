import { Card, Eyebrow } from '@/components/ui'
import type { Technique } from '@/lib/types'

/**
 * The examples.
 *
 * A technique becomes usable at the point you can hear yourself saying it, so
 * there are two: one general, and one in the hall — the second is the one that
 * gets used on a Thursday night.
 *
 * `inTheWild` then shows the move somewhere it mattered. Where the source is
 * public domain the line itself is shown; where it is not, the passage is
 * located and described instead. That is not only a rights decision — the
 * sentence belongs to whoever said it, and the structure underneath is the part
 * you can take.
 */
export function Examples({ technique }: { technique: Technique }) {
  return (
    <div className="stack">
      <div className="stack-sm">
        <Eyebrow>Sounds like</Eyebrow>
        <Card variant="quiet">
          <p className="spoken">“{technique.example}”</p>
        </Card>
      </div>

      <div className="stack-sm">
        <Eyebrow amber>On the mat</Eyebrow>
        <Card variant="amber">
          <p className="spoken">“{technique.matExample}”</p>
        </Card>
      </div>

      {technique.inTheWild ? <InTheWildBlock technique={technique} /> : null}
    </div>
  )
}

function InTheWildBlock({ technique }: { technique: Technique }) {
  const wild = technique.inTheWild
  if (!wild) return null

  return (
    <div className="stack-sm">
      <Eyebrow>Where it was used</Eyebrow>
      <Card>
        <div className="stack-sm">
          <div className="stack-sm" style={{ gap: 2 }}>
            <p className="heading">{wild.speaker}</p>
            <p className="caption faint">{wild.where}</p>
          </div>

          {wild.words ? (
            <>
              <hr className="rule" />
              <p className="spoken muted">“{wild.words}”</p>
            </>
          ) : null}

          <hr className="rule" />
          <div className="stack-sm" style={{ gap: 5 }}>
            <Eyebrow>What he did there</Eyebrow>
            <p className="caption">{wild.what}</p>
          </div>

          {/* Said once, plainly, rather than leaving a reader to wonder why some
              entries carry the words and others do not. */}
          {wild.words ? null : (
            <p className="caption faint" style={{ fontSize: 11.5 }}>
              The passage is described rather than quoted — it is still in copyright. The structure
              is the part that transfers, and you can attach a recording of it below.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
