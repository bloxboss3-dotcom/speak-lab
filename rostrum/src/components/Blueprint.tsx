import { Card, Eyebrow } from '@/components/ui'

/**
 * The technique with the words taken out.
 *
 * `structure` describes the move in the abstract, which is fine for recognising
 * one and useless for building one. This is the same pattern as a skeleton:
 * fixed scaffolding in plain text, and slots in brackets that the learner
 * fills. Reading down it should produce a usable line without having to
 * reverse-engineer it from the example.
 */
export function Blueprint({ lines }: { lines: string[] }) {
  return (
    <div className="stack-sm">
      <Eyebrow amber>Build one</Eyebrow>
      <Card variant="sunken">
        <div className="blueprint">
          {lines.map((line, index) => (
            <p key={index} className="blueprint-line">
              {renderSlots(line)}
            </p>
          ))}
        </div>
      </Card>
      <p className="caption faint">
        The words outside the brackets are the frame — say them roughly as they are. Everything in
        brackets is yours.
      </p>
    </div>
  )
}

/**
 * Splits on [slots] so they can be marked. A parenthetical line is a stage
 * direction rather than something to say, and is dimmed instead.
 */
function renderSlots(line: string) {
  if (line.startsWith('(') && line.endsWith(')')) {
    return <span className="blueprint-aside">{line}</span>
  }
  return line.split(/(\[[^\]]*\])/g).map((part, index) =>
    part.startsWith('[') ? (
      <span key={index} className="blueprint-slot">
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}
