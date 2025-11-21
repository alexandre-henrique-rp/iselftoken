declare namespace SessionNext {
  interface Session {
    user: User
    apiUser: UserApi
    expires?: string
    token?: string
    refreshToken?: string
  }

  interface Client {
    id: number
    name: string
    email: string
    avatar: string | null
    role: "user" | "admin" | "financeiro" | "compliance"
  }
}

type User = {
  id: number
  name: string
  email: string
  avatar: string | null
  role: "user" | "admin" | "financeiro" | "compliance"
}

type UserApi = {
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
  planos: [{
    id: string;
    nome: string;
    vencimento: string;
    ativo: boolean;
  }];
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