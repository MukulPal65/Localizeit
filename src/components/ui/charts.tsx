import { useId } from 'react'
import type { AnalyticsPoint } from '@/types'
import { cn } from '@/utils'

/**
 * Lightweight, token-themed SVG charts. No chart dependency.
 * All charts are labelled as demo data in the surrounding UI.
 */

export function BarChart({
  data,
  height = 150,
  format = (v: number) => String(v),
  tone = 'orange',
  className,
}: {
  data: AnalyticsPoint[]
  height?: number
  format?: (value: number) => string
  tone?: 'orange' | 'brown' | 'success'
  className?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const tones = {
    orange: 'bg-gradient-to-t from-orange-500 to-orange-300',
    brown: 'bg-gradient-to-t from-brown-800 to-brown-400',
    success: 'bg-gradient-to-t from-success to-success/50',
  }
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((point) => (
          <div key={point.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[9px] font-medium text-brown-400 opacity-0 transition-opacity group-hover:opacity-100">
              {format(point.value)}
            </span>
            <div
              className={cn('w-full max-w-9 rounded-t-md transition-all duration-300 hover:opacity-80', tones[tone])}
              style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
              title={`${point.label}: ${format(point.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((point) => (
          <span key={point.label} className="flex-1 truncate text-center text-[10px] text-brown-400">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function LineChart({
  data,
  height = 170,
  format = (v: number) => String(v),
  className,
}: {
  data: AnalyticsPoint[]
  height?: number
  format?: (value: number) => string
  className?: string
}) {
  const gradientId = useId().replace(/:/g, '')
  if (data.length === 0) return null
  const width = 320
  const paddingX = 6
  const paddingY = 10
  const max = Math.max(...data.map((d) => d.value), 1)
  const min = Math.min(...data.map((d) => d.value), 0)
  const range = max - min || 1
  const stepX = (width - paddingX * 2) / Math.max(1, data.length - 1)

  const points = data.map((d, i) => ({
    x: paddingX + i * stepX,
    y: paddingY + (1 - (d.value - min) / range) * (height - paddingY * 2),
    ...d,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EE7317" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#EE7317" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={paddingX}
            x2={width - paddingX}
            y1={paddingY + ratio * (height - paddingY * 2)}
            y2={paddingY + ratio * (height - paddingY * 2)}
            stroke="#EFE4D4"
            strokeWidth="0.7"
            strokeDasharray="3 4"
          />
        ))}
        <path d={area} fill={`url(#grad-${gradientId})`} />
        <path d={line} fill="none" stroke="#EE7317" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#FDF8F1" />
            <circle cx={point.x} cy={point.y} r="2.6" fill="#EE7317" />
            <title>{`${point.label}: ${format(point.value)}`}</title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {data.map((point) => (
          <span key={point.label} className="text-[10px] text-brown-400">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const DONUT_COLORS = ['#EE7317', '#C98A12', '#477A4B', '#9C7A5C', '#BE4030', '#4A6D8C']

export function DonutChart({
  data,
  size = 150,
  thickness = 16,
  centerLabel,
  centerValue,
  className,
}: {
  data: AnalyticsPoint[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
  className?: string
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className={cn('flex flex-wrap items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Distribution chart">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EFE4D4" strokeWidth={thickness} />
          {data.map((point, index) => {
            const length = (point.value / total) * circumference
            const circle = (
              <circle
                key={point.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${point.label}: ${point.value}`}</title>
              </circle>
            )
            offset += length
            return circle
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-heading text-lg font-semibold text-brown-900">{centerValue}</span>
            <span className="text-[10px] text-brown-400">{centerLabel}</span>
          </div>
        )}
      </div>
      <ul className="min-w-[140px] flex-1 space-y-1.5">
        {data.map((point, index) => (
          <li key={point.label} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-brown-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              {point.label}
            </span>
            <span className="font-medium text-brown-800">
              {Math.round((point.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HorizontalBars({
  data,
  format = (v: number) => String(v),
  className,
}: {
  data: AnalyticsPoint[]
  format?: (value: number) => string
  className?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className={cn('space-y-2.5', className)}>
      {data.map((point) => (
        <div key={point.label}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-brown-600">{point.label}</span>
            <span className="font-medium text-brown-800">{format(point.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-300"
              style={{ width: `${Math.max(2, (point.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Sparkline({
  values,
  className,
  tone = '#EE7317',
}: {
  values: number[]
  className?: string
  tone?: string
}) {
  if (!values.length) return null
  const width = 100
  const height = 28
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = width / Math.max(1, values.length - 1)
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-7 w-full', className)} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
