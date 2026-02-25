'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  formatFn?: (n: number) => string
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 800,
  formatFn,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = prevValue.current
    const diff = value - start
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + diff * eased

      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevValue.current = value
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = formatFn ? formatFn(display) : Math.round(display).toString()

  return <span className={className}>{formatted}</span>
}
