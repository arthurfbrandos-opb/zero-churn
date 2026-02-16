'use client'

interface ChurnSparklineProps {
  data: { month: string; avgChurnProbability: number }[]
}

export function ChurnSparkline({ data }: ChurnSparklineProps) {
  const max = Math.max(...data.map((d) => d.avgChurnProbability))
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const trend = last.avgChurnProbability - prev.avgChurnProbability

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-12">
        {data.map((d, i) => {
          const heightPct = (d.avgChurnProbability / (max * 1.2)) * 100
          const isLast = i === data.length - 1
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end" style={{ height: '40px' }}>
                <div
                  className={`w-full rounded-sm transition-all ${isLast ? 'bg-red-500' : 'bg-zinc-700'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-zinc-600 text-[10px] leading-none">{d.month}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs">Churn médio</span>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 text-sm font-bold">{last.avgChurnProbability}%</span>
          <span className={`text-xs font-medium ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {trend > 0 ? `+${trend}pp` : `${trend}pp`}
          </span>
        </div>
      </div>
    </div>
  )
}
