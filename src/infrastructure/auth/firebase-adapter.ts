// Implementação do Adaptador de Autenticação Genérico
// Segue a interface AuthService para garantir compatibilidade com Clean Architecture

import { AuthService, AuthResult, SessionData } from './adapter';
import { mockLogin } from '@/mock/mock-login';

// Usa mockLogin para simular comportamento até a integração com API externa

export class GenericAuthAdapter implements AuthService {
  async login(email: string, password: string): Promise<AuthResult> {
    console.log('GenericAuthAdapter: Usando mockLogin para autenticação', { email, password });
    
    const result = await mockLogin({ email, password }) as any;
    if (result.status === 'success' && result.data) {
      return {
        success: true,
        data: {
          user: {
            id: result.data.user.id.toString(),
            email: result.data.user.email,
            name: result.data.user.name,
            role: result.data.user.role,
          },
          token: result.data.token,
          refresh_token: result.data.refresh_token || 'simulated-refresh-token',
        },
      };
    } else {
      return {
        success: false,
        error: result.message || 'Credenciais inválidas',
      };
    }
  }

  async logout(): Promise<void> {
    console.log('GenericAuthAdapter: Simulando logout');
    return;
  }

  async getSession(): Promise<SessionData | null> {
    console.log('GenericAuthAdapter: Simulando obtenção de sessão');
    // Simulação de sessão para testes
    return {
      user: {
        id: '1',
        email: 'startup@teste.com',
        name: 'Startup teste',
        role: 'startup',
      },
      token: 'simulated-jwt-token',
    };
  }
}
