'use client'

import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getColor(score: number) {
  if (score >= 70) return { stroke: '#10b981', text: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.4)' }
  if (score >= 45) return { stroke: '#f59e0b', text: 'text-yellow-400', glow: 'rgba(245, 158, 11, 0.4)' }
  return { stroke: '#ef4444', text: 'text-red-400', glow: 'rgba(239, 68, 68, 0.4)' }
}

const sizeConfig = {
  sm: { size: 48,  strokeWidth: 4, fontSize: 'text-xs',  glowSize: 6  },
  md: { size: 80,  strokeWidth: 5, fontSize: 'text-base', glowSize: 10 },
  lg: { size: 140, strokeWidth: 8, fontSize: 'text-3xl',  glowSize: 16 },
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const { size: svgSize, strokeWidth, fontSize, glowSize } = sizeConfig[size]
  const { stroke, text, glow } = getColor(score)

  const radius = (svgSize - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75
  const offset = arc - (score / 100) * arc

  const cx = svgSize / 2
  const cy = svgSize / 2
  const filterId = `glow-${size}-${score}`

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-[135deg]">
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={glowSize / 2} result="blur" />
              <feFlood floodColor={glow} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Trilha */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc} ${circumference - arc}`}
            strokeLinecap="round"
          />
          {/* Progresso com glow */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc - offset} ${circumference - (arc - offset)}`}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            className="animate-gauge-draw"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Score no centro */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold leading-none', fontSize, text)}>
            {score}
          </span>
        </div>
      </div>
    </div>
  )
}
