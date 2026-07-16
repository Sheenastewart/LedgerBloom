type ChartDatum = {
  label: string
  value: number
  color?: string
}

type SimpleBarChartProps = {
  data: ChartDatum[]
  ariaLabel: string
  maxBars?: number
}

export function SimpleBarChart({ data, ariaLabel, maxBars = 8 }: SimpleBarChartProps) {
  const rows = data.slice(0, maxBars)
  const max = Math.max(...rows.map((d) => d.value), 1)

  return (
    <div className="chart-panel" role="img" aria-label={ariaLabel}>
      <ul className="bar-chart">
        {rows.map((row) => (
          <li key={row.label} className="bar-chart__row">
            <span className="bar-chart__label">{row.label}</span>
            <span className="bar-chart__track">
              <span
                className="bar-chart__fill"
                style={{
                  width: `${Math.max(2, (row.value / max) * 100)}%`,
                  background: row.color ?? 'var(--lb-color-primary)',
                }}
              />
            </span>
            <span className="bar-chart__value numeric">{formatShort(row.value)}</span>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="chart-empty">No data for this period.</p> : null}
    </div>
  )
}

type SimpleLineChartProps = {
  data: ChartDatum[]
  ariaLabel: string
  color?: string
}

export function SimpleLineChart({ data, ariaLabel, color = 'var(--lb-color-info)' }: SimpleLineChartProps) {
  const width = 320
  const height = 120
  const padding = 12
  if (data.length === 0) {
    return (
      <div className="chart-panel" role="img" aria-label={ariaLabel}>
        <p className="chart-empty">No data for this period.</p>
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const min = Math.min(...data.map((d) => d.value), 0)
  const span = Math.max(max - min, 1)
  const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1)
  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = height - padding - ((d.value - min) / span) * (height - padding * 2)
    return `${x},${y}`
  })

  return (
    <div className="chart-panel" role="img" aria-label={ariaLabel}>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} width="100%" height="140">
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={points.join(' ')} />
        {data.map((d, i) => {
          const [x, y] = points[i]!.split(',').map(Number)
          return <circle key={d.label} cx={x} cy={y} r="3.5" fill={color} />
        })}
      </svg>
      <div className="line-chart__labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

type SimpleCompareChartProps = {
  income: number
  expenses: number
  ariaLabel: string
}

export function SimpleCompareChart({ income, expenses, ariaLabel }: SimpleCompareChartProps) {
  const max = Math.max(income, expenses, 1)
  return (
    <div className="chart-panel" role="img" aria-label={ariaLabel}>
      <ul className="bar-chart bar-chart--compare">
        <li className="bar-chart__row">
          <span className="bar-chart__label">Income</span>
          <span className="bar-chart__track">
            <span
              className="bar-chart__fill"
              style={{ width: `${(income / max) * 100}%`, background: 'var(--lb-color-success)' }}
            />
          </span>
          <span className="bar-chart__value numeric">{formatShort(income)}</span>
        </li>
        <li className="bar-chart__row">
          <span className="bar-chart__label">Expenses</span>
          <span className="bar-chart__track">
            <span
              className="bar-chart__fill"
              style={{ width: `${(expenses / max) * 100}%`, background: 'var(--lb-color-warning)' }}
            />
          </span>
          <span className="bar-chart__value numeric">{formatShort(expenses)}</span>
        </li>
      </ul>
    </div>
  )
}

function formatShort(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
