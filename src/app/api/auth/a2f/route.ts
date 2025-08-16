import { NextResponse } from "next/server"
import { GetSessionServer } from "@/context/auth"

/*
 * POST /api/auth/a2f
 * Lê a sessão no servidor e envia (simulado) um código A2F para o e-mail do usuário.
 * Body opcional: { email?: string }
 */
export async function POST(request: Request) {
  try {
    const session = await GetSessionServer()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { email?: string }

    const sessionEmail = (session as any)?.user?.email ?? (session as any)?.email
    const email = body?.email ?? sessionEmail

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail não encontrado na sessão" }, { status: 400 })
    }

    // Simulação de envio do código A2F (e.g., via provider de e-mail)
    console.log(`[A2F] Enviando código A2F para: ${email}`)

    return NextResponse.json({ ok: true, message: "Código A2F enviado" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao solicitar A2F" }, { status: 500 })
  }
}
