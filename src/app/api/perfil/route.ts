import { GetSessionServer } from '@/context/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await GetSessionServer();
    if (!session) {
      return NextResponse.json({ message: 'Não autenticado', error: null }, { status: 401 });
    }

    const user = await fetch(
      `${process.env.NEXTAUTH_API_URL}/startup/${session.user.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${session.refreshToken}`,
        },
      },
    );
    const userData = await user.json();
    console.log('🚀 ~ GET ~ userData:', userData);
    if (!user.ok) {
      return NextResponse.json(
        {
          message: userData.message || 'Erro ao buscar perfil',
          error: null,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        message: 'Perfil buscado com sucesso',
        data: userData,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Erro ao buscar perfil',
        error: JSON.stringify(error, null, 2) || null,
      },
      { status: 500 },
    );
  }
}
