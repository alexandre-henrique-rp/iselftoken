/*
 * useSession
 * Hook responsável por obter a sessão do usuário em componentes client.
 * Ele consulta a rota GET `/api/auth`, que devolve o payload do JWT lido do cookie httpOnly pelo servidor.
 * Retorna: { session, loading, error, refresh }.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

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
  const redirectingRef = useRef<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()

  // Rotas públicas nas quais não devemos redirecionar nem buscar sessão
  const PUBLIC_ROUTES = useMemo(() => new Set([
    "/login",
    "/auth",
    "/register",
    "/recuperar-senha",
    "/redefinir-senha",
    "/termos-de-uso",
  ]), [])

  const handleUnauthenticated = useCallback(async () => {
    if (redirectingRef.current) return
    // Em rotas públicas não redireciona nem deleta sessão
    if (PUBLIC_ROUTES.has(pathname)) return
    redirectingRef.current = true
    try {
      await fetch("/api/auth", { method: "DELETE", credentials: "include" })
    } catch {}
    // garante que não fica preso em histórico
    router.replace("/login")
  }, [PUBLIC_ROUTES, pathname, router])

  const fetchSession = useCallback(async () => {
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const signal = controller.signal

    try {
      const res = await fetch("/api/auth", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // garante que o cookie httpOnly seja enviado (mesmo domínio)
        credentials: "include",
        cache: "no-store",
        signal,
      })

      if (!res.ok) {
        throw new Error(`Falha ao obter sessão (status ${res.status})`)
      }

      const data = (await res.json()) as { session?: SessionNext.Session | null }

      if (mountedRef.current) {
        const sess = data?.session ?? null
        const currentUser = sess?.user ?? null
        setUser(currentUser)
        if (sess === null || !currentUser) {
          // sessão inválida/expirada: limpar e redirecionar
          await handleUnauthenticated()
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Erro desconhecido"
        setError(message)
        setUser(null)
        await handleUnauthenticated()
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }

    return () => controller.abort()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    // Em páginas públicas, evitamos o fetch para acelerar o carregamento
    if (PUBLIC_ROUTES.has(pathname)) {
      setLoading(false)
      return () => { mountedRef.current = false }
    }

    fetchSession()

    return () => {
      mountedRef.current = false
    }
  }, [fetchSession, PUBLIC_ROUTES, pathname])

  const refresh = useCallback(async () => {
    await fetchSession()
  }, [fetchSession])

  return useMemo(
    () => ({ user, loading, error, refresh }),
    [user, loading, error, refresh]
  )
}
