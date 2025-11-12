/**
 * Tipos para dados armazenados no localStorage
 * Segue princípios de Clean Architecture e TypeScript
 */

export interface RegistroPendenteData {
  /** Nome completo do usuário */
  nome: string;
  /** Email válido para cadastro */
  email: string;
  /** Telefone com DDI */
  telefone: string;
  /** Senha forte */
  senha: string;
  /** Confirmação de senha */
  confirmarSenha: string;
  /** Aceitação dos termos de uso */
  termosAceitos: boolean;
  /** Aceitação da política de privacidade */
  politicaAceita: boolean;
  /** Plano selecionado pelo usuário */
  plano: 'investidor' | 'fundador' | 'afiliado';
  /** Timestamp da criação do registro */
  timestamp: string;
}

export interface PlanoSelecionadoData {
  /** Nome do plano selecionado */
  plano: 'iself-investidor' | 'iself-fundador' | 'iself-afiliado';
  /** Nome do produto (opcional, sobrescreve plano se existir) */
  produto?: string;
  /** Valor do plano selecionado */
  valor: string;
  /** Validade do plano em meses */
  validade: number;
  /** Observações adicionais (opcional) */
  obs?: string;
  /** Timestamp da seleção */
  timestamp: string;
}

export interface LocalStorageKeys {
  /** Chave para dados de registro pendente */
  registro_pendente: 'registro_pendente';
  /** Chave para dados do plano selecionado */
  plano_selecionado: 'plano_selecionado';
}

/**
 * Serviço para gerenciar dados no localStorage
 */
export class LocalStorageService {
  /**
   * Salva dados de registro pendente no localStorage
   */
  static salvarRegistroPendente(dados: Omit<RegistroPendenteData, 'timestamp'>): void {
    const dadosComTimestamp: RegistroPendenteData = {
      ...dados,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('registro_pendente', JSON.stringify(dadosComTimestamp));
  }

  /**
   * Recupera dados de registro pendente do localStorage
   */
  static recuperarRegistroPendente(): RegistroPendenteData | null {
    try {
      const dados = localStorage.getItem('registro_pendente');
      return dados ? JSON.parse(dados) : null;
    } catch (error) {
      console.error('Erro ao recuperar dados do localStorage:', error);
      return null;
    }
  }

  /**
   * Salva dados do plano selecionado separadamente
   */
  static salvarPlanoSelecionado(dados: Omit<PlanoSelecionadoData, 'timestamp'>): void {
    const dadosComTimestamp: PlanoSelecionadoData = {
      ...dados,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('plano_selecionado', JSON.stringify(dadosComTimestamp));
  }

  /**
   * Recupera dados do plano selecionado
   */
  static recuperarPlanoSelecionado(): PlanoSelecionadoData | null {
    try {
      const dados = localStorage.getItem('plano_selecionado');
      return dados ? JSON.parse(dados) : null;
    } catch (error) {
      console.error('Erro ao recuperar plano selecionado:', error);
      return null;
    }
  }

  /**
   * Remove dados de registro pendente do localStorage
   */
  static limparRegistroPendente(): void {
    localStorage.removeItem('registro_pendente');
  }

  /**
   * Remove dados do plano selecionado
   */
  static limparPlanoSelecionado(): void {
    localStorage.removeItem('plano_selecionado');
  }

  /**
   * Limpa todos os dados relacionados ao registro e plano
   */
  static limparTodosDados(): void {
    this.limparRegistroPendente();
    this.limparPlanoSelecionado();
  }
}
