import { z } from "zod";

export const forgotPasswordValidSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  codigo: z.string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length == 6, { message: 'O codigo deve conter 6 dígitos' }),
})

export type PasswordValidType = z.infer<typeof forgotPasswordValidSchema>



export const newPasswordSchema = z.object({
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmarSenha: z.string(),
  // token: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não conferem",
  path: ["confirmacaoSenha"],
});

export type NewPasswordType = z.infer<typeof newPasswordSchema>;
