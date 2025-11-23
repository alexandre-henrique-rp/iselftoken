import { NextResponse } from 'next/server';
import { SetSession2fa } from '@/context/auth';


export async function POST() {
  try {
    await SetSession2fa(true, { path: '/', expires: 60 * 60 * 24 * 7 })
    return NextResponse.json(
      { message: 'A2F ativado com sucesso' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Erro geral no PUT A2F:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}

