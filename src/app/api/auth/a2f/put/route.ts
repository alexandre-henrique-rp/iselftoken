import { GetSessionServer, SetA2fVerified } from "@/context/auth"
import { NextResponse } from "next/server"

export async function PUT(request: Request) {
  try {
    const session = await GetSessionServer()
    const body = await request.json()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    console.log("🚀 ~ PUT ~ body:", body)
    await SetA2fVerified(body.status)
    return NextResponse.json({ ok: true, message: "A2F verificado" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}