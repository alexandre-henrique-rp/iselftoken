import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10, { message: "Telefone inválido" }),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmacaoSenha: z.string(),
  codigo: z.string()
    .transform((val) => val.replace(/\D/g, '')),
  termosAceitos: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar os termos de uso",
  }),
  politicaAceita: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar a política de privacidade",
  }),
}).refine((data) => data.senha === data.confirmacaoSenha, {
  message: "As senhas não conferem",
  path: ["confirmacaoSenha"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
