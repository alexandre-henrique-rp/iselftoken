/**
 * @file address.d.ts
 * @description Tipos e interfaces para endereço e localização
 */

export interface Endereco {
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface Pais {
  iso3: string;
  nome: string;
  emoji: string;
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}


export interface BrasilCepResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location: {
    type: string;
    coordinates: { 
      longitude: string; 
      latitude: string 
    };
  };
}
