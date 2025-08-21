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
    if (!email) {
      return NextResponse.json({ error: "E-mail da sessão não encontrado" }, { status: 400 })
    }

    const rec = A2fMemory.get(email)
    if (!rec) {
      return NextResponse.json({ error: "Código A2F não solicitado. Reenvie o código." }, { status: 400 })
    }

   

    await SetA2fVerified(Boolean(body.status))
    // Após sucesso, limpar registro
    A2fMemory.delete(email)
    return NextResponse.json({ ok: true, message: "A2F verificado" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}