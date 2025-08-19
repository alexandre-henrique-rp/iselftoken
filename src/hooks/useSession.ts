/*
 * useSession
 * Hook simples e direto para obter a sessão do usuário via GET `/api/auth/session`.
 * Retorna: { user, loading, error, refresh }.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type SessionPayload = Record<string, unknown> & {
  exp?: number
  iat?: number
}

export type UseSessionResult = {
  user: User | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef<boolean>(false)

  const fetchSession = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error(`Falha ao obter sessão (status ${res.status})`)
      }

      // A rota retorna a sessão diretamente (não embrulhada)
      const sess = (await res.json()) as SessionNext.Session | null
     

      if (mountedRef.current) {
        const currentUser = sess?.user ?? null
        setUser(currentUser)
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Erro desconhecido"
        setError(message)
        setUser(null)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchSession()
    return () => { mountedRef.current = false }
  }, [fetchSession])

  const refresh = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

  return useMemo(
    () => ({ user, loading, error, refresh }),
    [user, loading, error, refresh]
  )
}
