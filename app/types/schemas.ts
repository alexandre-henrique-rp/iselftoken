/**
 * @file schemas.ts
 * @description Schemas de validação Zod para formulários
 */

import * as z from "zod";

export const perfilSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  data_nascimento: z.string().min(1, "Data de nascimento obrigatória"),
  genero: z.enum(["HOMEM", "MULHER", "NAO_INFORMADO", ""]),
  endereco: z.string().min(3, "Endereço deve ter no mínimo 3 caracteres"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string(),
  bairro: z.string().min(2, "Bairro deve ter no mínimo 2 caracteres"),
  cidade: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
  uf: z.string().min(2, "Estado obrigatório"),
  cep: z.string().min(8, "CEP inválido"),
  pais: z
    .object({
      id: z.number(),
      name: z.string().min(1),
      native: z.string().min(1),
      iso2: z.string().min(2),
      iso3: z.string().min(3),
      emoji: z.string().min(1),
    })
    .refine((value) => Boolean(value?.iso3), "País obrigatório"),
  tipo_documento: z.string(),
  reg_documento: z.string().min(1, "Número do documento obrigatório"),
});
