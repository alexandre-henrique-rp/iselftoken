import { GetSessionServer } from "@/context/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await GetSessionServer()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    return NextResponse.json(session)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}