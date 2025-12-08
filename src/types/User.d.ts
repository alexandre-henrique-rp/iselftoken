declare namespace UserType {
  interface Get {
    id: number;
    nome: string;
    email: string;
    role: 'user' | 'admin' | 'financeiro' | 'compliance';
    telefone: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    pais: string;
    numero: string;
    complemento: string;
    comprovante_residencia_url: string; // url da imagem do comprovante de residência
    genero: string;
    dataNascimento: string;
    tipo_documento: string; // tipo do documento cnh, passaporte, etc
    data_emissao: string;  // data de emissao do documento
    reg_documento: string; // numero do documento
    documento_url: string; // url da imagem do documento
    estadoCivil: string;
    profissao: string;
    bio_facial_url: string; // url da imagem do bio facial
    avatar: string;
    planos: [
      {
        id: string;
        nome: string;
        vencimento: string;
        ativo: boolean;
      }
    ];
    pacotes: [
      {
        id: string;
        nome: string;
        vencimento: string;
        ativo: boolean;
      }
    ];
    startups?: number[]; // lista de array do ids das startups relacionadas
    tokens?: number[]; // lista de array do ids dos tokens
    edicao: boolean;
  }
  
  interface Update {
    nome: string;
    email: string;
    role: 'user' | 'admin' | 'financeiro' | 'compliance';
    telefone: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    pais: string;
    numero: string;
    complemento: string;
    comprovante_residencia_url: string; // url da imagem do comprovante de residência
    genero: string;
    dataNascimento: string;
    tipo_documento: string; // tipo do documento cnh, passaporte, etc
    data_emissao: string;  // data de emissao do documento
    reg_documento: string; // numero do documento
    documento_url: string; // url da imagem do documento
    estadoCivil: string;
    profissao: string;
    bio_facial_url: string; // url da imagem do bio facial
    avatar: string;
    planos: [
      {
        id: string;
        nome: string;
        vencimento: string;
        ativo: boolean;
      }
    ];
    pacotes: [
      {
        id: string;
        nome: string;
        vencimento: string;
        ativo: boolean;
      }
    ];
    edicao: boolean;
  }

  interface Register {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    confirmarSenha: string;
    termosAceitos: boolean;
    politicaAceita: boolean;
  }

  interface FormErrors {
    nome?: string;
    email?: string;
    telefone?: string;
    senha?: string;
    confirmarSenha?: string;
    termos?: string;
  }
}