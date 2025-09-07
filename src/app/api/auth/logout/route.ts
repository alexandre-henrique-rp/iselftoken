import { NextResponse } from 'next/server';
import { DeleteSession } from '@/context/auth';

/**
 * POST /api/auth/logout
 * Endpoint para fazer logout do usuário
 * Remove os cookies de sessão e A2F
 */
export async function POST() {
  try {
    // Remove a sessão e cookies relacionados
    await DeleteSession();

    return NextResponse.json(
      {
        status: 'success',
        message: 'Logout realizado com sucesso',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro no logout:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
