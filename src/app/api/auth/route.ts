import { CreateSessionToken, GetSessionServer, DeleteSession } from "@/context/auth"
import { NextResponse } from "next/server"



export async function POST(request: Request) {
    try {
      const body = await request.json()
      console.log(body)
      await CreateSessionToken(body)
      return NextResponse.json({ message: "Autenticado com sucesso" }, { status: 200 })
    } catch (error) {
      console.log(error)
      return NextResponse.json({ error: "Erro ao autenticar" }, { status: 500 })
    }
}

// GET /api/auth -> retorna a sessão atual (payload do JWT) ou null
export async function GET() {
  try {
    const session = await GetSessionServer()
    return NextResponse.json({ session: session ?? null }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}

// DELETE /api/auth -> destrói a sessão (deleta cookie)
export async function DELETE() {
  try {
    await DeleteSession()
    return NextResponse.json({ message: "Sessão finalizada" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao finalizar sessão" }, { status: 500 })
  }
}
