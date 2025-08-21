import { GetSessionServer, SetA2fVerified } from "@/context/auth"
import { NextResponse } from "next/server"
import { A2fMemory } from "@/modules/codigo/a2f-memory"

export async function PUT(request: Request) {
  try {
    const session = await GetSessionServer()
    console.log("🚀 ~ PUT ~ session:", session)
    const body = await request.json()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    console.log("🚀 ~ PUT ~ body:", body)

    const email = session?.user?.email
    console.log("🚀 ~ PUT ~ email:", email)
    if (!email) {
      return NextResponse.json({ error: "E-mail da sessão não encontrado" }, { status: 400 })
    }
    await SetA2fVerified(Boolean(body.status))
    return NextResponse.json({ ok: true, message: "A2F verificado" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}