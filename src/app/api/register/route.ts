import { NextResponse } from "next/server";


export async function POST () {
    try {
      return NextResponse.json({ message: 'Usuário registrado com sucesso' }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao registrar usuário' }, { status: 500 });
    }
}