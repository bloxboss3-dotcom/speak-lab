/**
 * Small hand-drawn SVG charts.
 *
 * No chart library: three shapes are all this app needs, and a dependency that
 * ships its own type scale and colours would fight the design rather than serve
 * it. Every chart here refuses to render below a minimum number of points,
 * because a two-point "trend" is decoration, not evidence.
 */

export interface SeriesPoint {
  label: string
  value: number
}

export function TrendChart({
  points,
  band,
  height = 120,
  format = (value: number) => String(Math.round(value)),
}: {
  points: SeriesPoint[]
  /** Optional comfortable range drawn behind the line. */
  band?: { low: number; high: number }
  height?: number
  format?: (value: number) => string
}) {
  if (points.length < 3) return null

  const width = 320
  const padding = { top: 10, right: 8, bottom: 18, left: 30 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const values = points.map((point) => point.value)
  const lowest = Math.min(...values, band?.low ?? Infinity)
  const highest = Math.max(...values, band?.high ?? -Infinity)
  const span = Math.max(1, highest - lowest)
  const min = lowest - span * 0.12
  const max = highest + span * 0.12
  const range = Math.max(1, max - min)

  const x = (index: number) =>
    padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
  const y = (value: number) => padding.top + innerHeight - ((value - min) / range) * innerHeight

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.value)}`).join(' ')

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend from ${format(values[0] ?? 0)} to ${format(values[values.length - 1] ?? 0)}`}
    >
      {band ? (
        <rect
          className="chart__band"
          x={padding.left}
          y={y(band.high)}
          width={innerWidth}
          height={Math.max(1, y(band.low) - y(band.high))}
          rx={3}
        />
      ) : null}
      <line
        className="chart__grid"
        x1={padding.left}
        x2={width - padding.right}
        y1={padding.top + innerHeight}
        y2={padding.top + innerHeight}
      />
      <text className="chart__label" x={2} y={padding.top + 8}>
        {format(max)}
      </text>
      <text className="chart__label" x={2} y={padding.top + innerHeight}>
        {format(min)}
      </text>
      <path className="chart__line" d={path} />
      {points.map((point, index) => (
        <circle key={`${point.label}-${index}`} className="chart__point" cx={x(index)} cy={y(point.value)} r={3} />
      ))}
      <text className="chart__label" x={padding.left} y={height - 4}>
        {points[0]?.label}
      </text>
      <text className="chart__label" x={width - padding.right} y={height - 4} textAnchor="end">
        {points[points.length - 1]?.label}
      </text>
    </svg>
  )
}

export function BarChart({
  points,
  height = 110,
  highlightLast = true,
}: {
  points: SeriesPoint[]
  height?: number
  highlightLast?: boolean
}) {
  if (points.length === 0) return null

  const width = 320
  const padding = { top: 8, right: 4, bottom: 18, left: 4 }
  const innerHeight = height - padding.top - padding.bottom
  const max = Math.max(1, ...points.map((point) => point.value))
  const slot = (width - padding.left - padding.right) / points.length
  const barWidth = Math.max(4, slot * 0.56)

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${points.length} periods, highest ${max}`}
    >
      {points.map((point, index) => {
        const barHeight = Math.max(2, (point.value / max) * innerHeight)
        const isLast = index === points.length - 1
        return (
          <g key={`${point.label}-${index}`}>
            <rect
              className={highlightLast && !isLast ? 'chart__bar chart__bar--muted' : 'chart__bar'}
              x={padding.left + index * slot + (slot - barWidth) / 2}
              y={padding.top + innerHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={2}
            />
            {index % Math.ceil(points.length / 5) === 0 || isLast ? (
              <text
                className="chart__label"
                x={padding.left + index * slot + slot / 2}
                y={height - 4}
                textAnchor="middle"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

/** A one-line "not enough data yet" placeholder, so charts never lie by omission. */
export function NotYet({ need }: { need: string }) {
  return <p className="caption">{need}</p>
}
