'use client'

import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getColor(score: number) {
  if (score >= 70) return { stroke: '#10b981', text: 'text-emerald-400' }
  if (score >= 45) return { stroke: '#f59e0b', text: 'text-yellow-400' }
  return { stroke: '#ef4444', text: 'text-red-400' }
}

const sizeConfig = {
  sm: { size: 48,  strokeWidth: 4, fontSize: 'text-xs'  },
  md: { size: 80,  strokeWidth: 5, fontSize: 'text-base' },
  lg: { size: 140, strokeWidth: 8, fontSize: 'text-3xl'  },
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const { size: svgSize, strokeWidth, fontSize } = sizeConfig[size]
  const { stroke, text } = getColor(score)

  const radius = (svgSize - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  // Semicírculo: usamos 75% do círculo para o arco (270 graus)
  const arc = circumference * 0.75
  const offset = arc - (score / 100) * arc

  const cx = svgSize / 2
  const cy = svgSize / 2

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-[135deg]">
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
          {/* Progresso */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc - offset} ${circumference - (arc - offset)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
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
