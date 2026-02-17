'use client'

import { useState, useEffect } from 'react'

let _count = 0
let _listeners: Array<(n: number) => void> = []
let _fetched = false

function notify(n: number) {
  _count = n
  _listeners.forEach(l => l(n))
}

async function fetchCount() {
  if (_fetched) return
  _fetched = true
  try {
    const r = await fetch('/api/alerts?unread=1')
    if (!r.ok) return
    const d = await r.json()
    notify(d.unread_count ?? 0)
  } catch {
    // silencia — badge simplesmente não aparece
  }
}

export function useAlertsCount(): number {
  const [count, setCount] = useState(_count)

  useEffect(() => {
    _listeners.push(setCount)
    fetchCount()
    return () => {
      _listeners = _listeners.filter(l => l !== setCount)
    }
  }, [])

  return count
}

/** Chama após marcar alertas como lidos para atualizar o badge */
export function refreshAlertsCount() {
  _fetched = false
  fetchCount()
}
