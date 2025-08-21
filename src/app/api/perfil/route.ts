import { NextResponse } from "next/server";



export async function GET(request: Request) {
  try {
   console.log("🚀 ~ GET ~:", "aki")
    return NextResponse.json({
      message: 'Perfil buscado com sucesso'
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}