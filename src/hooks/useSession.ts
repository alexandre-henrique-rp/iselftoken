/*
 * useSession
 * Hook simples e direto para obter a sessão do usuário via GET `/api/auth/session`.
 * Retorna: { user, loading, error, refresh }.
 */
<<<<<<< Updated upstream
=======
import { useRouter } from "next/navigation"
>>>>>>> Stashed changes
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type SessionPayload = Record<string, unknown> & {
  exp?: number
  iat?: number
}

export type UseSessionResult = {
  user: User | null
<<<<<<< Updated upstream
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
=======
  apiUser: UserApi | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
>>>>>>> Stashed changes
}

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<User | null>(null)
<<<<<<< Updated upstream
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef<boolean>(false)
=======
  const [apiUser, setApiUser] = useState<UserApi | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef<boolean>(false)
  const router = useRouter()
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
     
=======

>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
  useEffect(() => {
    mountedRef.current = true
    fetchSession()
    return () => { mountedRef.current = false }
  }, [fetchSession])
=======
  const fetchApiUser = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/perfil/${user?.id}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error(`Falha ao obter sessão (status ${res.status})`)
      }

      // A rota retorna a sessão diretamente (não embrulhada)
      const sess = await res.json()
      setApiUser(sess.data)
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Erro desconhecido"
        setError(message)
        setApiUser(null)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    mountedRef.current = true
    fetchSession()
    fetchApiUser()
    return () => { mountedRef.current = false }
  }, [fetchSession, fetchApiUser])
>>>>>>> Stashed changes

  const refresh = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

<<<<<<< Updated upstream
  return useMemo(
    () => ({ user, loading, error, refresh }),
    [user, loading, error, refresh]
=======
  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Falha ao fazer logout (status ${res.status})`)
      }

      // Limpa o estado local após logout bem-sucedido
      if (mountedRef.current) {
        setUser(null)
        setError(null)
      }

      // Redireciona para a página inicial
      router.push('/')
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Erro ao fazer logout"
        setError(message)
      }
      throw err // Re-throw para permitir tratamento no componente
    }
  }, [router])

  return useMemo(
    () => ({ user, apiUser, loading, error, refresh, logout }),
    [user, apiUser, loading, error, refresh, logout]
>>>>>>> Stashed changes
  )
}
