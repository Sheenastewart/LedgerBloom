type ProgressRingProps = {
  percent: number
  size?: number
  strokeWidth?: number
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  label?: string
  valueLabel?: string
}

const TONE_COLOR: Record<NonNullable<ProgressRingProps['tone']>, string> = {
  success: 'var(--lb-color-success)',
  warning: 'var(--lb-color-warning)',
  danger: 'var(--lb-color-danger)',
  info: 'var(--lb-color-info)',
  neutral: 'var(--lb-color-inactive)',
}

export function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 7,
  tone = 'info',
  label,
  valueLabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const display = valueLabel ?? `${Math.round(clamped)}%`

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={label ? undefined : true}>
        {label ? <title>{label}</title> : null}
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_COLOR[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="progress-ring__label">{display}</span>
    </div>
  )
}
