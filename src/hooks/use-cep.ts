'use client'

import { useState, useCallback } from 'react'

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export function useCep() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCep = useCallback(async (cep: string): Promise<CepData | null> => {
    const cleaned = cep.replace(/\D/g, '')
    if (cleaned.length !== 8) return null

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const data: CepData = await res.json()

      if (data.erro) {
        setError('CEP não encontrado')
        return null
      }

      return data
    } catch {
      setError('Erro ao buscar CEP')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchCep, loading, error }
}
