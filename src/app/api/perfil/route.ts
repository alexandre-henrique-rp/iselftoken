import { GetSessionServer } from "@/context/auth";
import { NextResponse } from "next/server";



export async function GET(request: Request) {
  try {
    const session = await GetSessionServer();
    console.log("🚀 ~ GET ~ session:", session)
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    
    const user = await fetch(`${process.env.NEXTAUTH_API_URL}/startup/${session.user.id}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${session.refreshToken}`,
      },
    });
    const userData = await user.json();
    console.log("🚀 ~ GET ~ userData:", userData)
    return NextResponse.json({
      message: 'Perfil buscado com sucesso',
      data: userData
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}