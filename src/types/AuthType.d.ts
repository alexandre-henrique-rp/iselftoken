export interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): Promise<SessionData | null>;
}

export interface AuthResult {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: 'investidor' | 'startup' | 'admin' | 'afiliado';
    };
    token: string;
    refresh_token?: string;
  };
  error?: string;
}

export interface SessionData {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: 'investidor' | 'startup' | 'admin' | 'afiliado';
  };
  token: string;
}