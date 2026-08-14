'use client'

import { useState } from 'react'
import { Card, Eyebrow } from '@/components/ui'
import type { Breakdown } from '@/lib/types'

/**
 * One that works, taken apart.
 *
 * Explaining a technique and then asking for a performance is a classroom
 * model. Showing a line that works, marking what every part of it is doing, and
 * then asking for the same shape is closer to how a physical skill is taught:
 * watch it, see the pieces, copy it.
 *
 * The whole thing is shown first at full speed, because a line read one
 * fragment at a time never sounds like anything. Then it comes apart.
 */
export function TakenApart({ breakdown }: { breakdown: Breakdown }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="stack">
      <div className="stack-sm">
        <Eyebrow amber>Here is one that works</Eyebrow>
        <Card variant="amber">
          <p className="spoken">
            “{breakdown.lines.map((line) => line.text).join(' ')}”
          </p>
        </Card>
        <p className="caption faint">
          {breakdown.verbatim ? breakdown.source : `${breakdown.source} — not a quotation.`}
        </p>
      </div>

      {open ? (
        <div className="stack-sm">
          <Eyebrow>What each line is doing</Eyebrow>
          <div className="stack-sm">
            {breakdown.lines.map((line, index) => (
              <Card key={index}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <span
                    className="numeral faint"
                    style={{ fontSize: 12, width: 14, paddingTop: 4, flexShrink: 0 }}
                  >
                    {index + 1}
                  </span>
                  <div className="stack-sm" style={{ gap: 6, minWidth: 0 }}>
                    <p className="spoken" style={{ fontSize: 16 }}>
                      “{line.text}”
                    </p>
                    <p className="caption faint">{line.doing}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card variant="sunken">
            <div className="stack-sm">
              <Eyebrow amber>Now you</Eyebrow>
              <p className="body">{breakdown.nowYou}</p>
            </div>
          </Card>
        </div>
      ) : (
        <button type="button" className="btn btn-block" onClick={() => setOpen(true)}>
          Take it apart
        </button>
      )}
    </div>
  )
}
