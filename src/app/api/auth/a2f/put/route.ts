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
    
    // Simulação de recuperação de dados do código A2F (em produção, usar banco de dados ou cache)
    const a2fData = {
      code: "123456", // Este valor deve ser recuperado de um armazenamento real
      expiration: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // Exemplo de código expirado
      attempts: 0,
      maxAttempts: 3
    };
    
    // Verifica se o código expirou
    if (new Date(a2fData.expiration) < new Date()) {
      return NextResponse.json({ error: "Código A2F expirado" }, { status: 400 });
    }
    
    // Verifica limite de tentativas
    a2fData.attempts += 1;
    if (a2fData.attempts > a2fData.maxAttempts) {
      return NextResponse.json({ error: "Limite de tentativas excedido" }, { status: 400 });
    }
    
    // Valida o código (simulação, substituir por lógica real)
    if (body.code !== a2fData.code) {
      return NextResponse.json({ error: "Código A2F inválido" }, { status: 400 });
    }
    
    await SetA2fVerified(body.status)
    return NextResponse.json({ ok: true, message: "A2F verificado" }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao obter sessão" }, { status: 500 })
  }
}