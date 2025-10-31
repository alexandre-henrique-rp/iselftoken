import { z } from 'zod'

/**
 * Schema de validação completo para edição de Startup
 * Inclui todos os campos do épico: informações básicas, classificação,
 * apresentação/pitch, investimento e documentação KYB
 */

// Validação customizada de CNPJ
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/

// Validação de URL do YouTube
const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+(&[\w=]*)?$/

// Schema para redes sociais dinâmicas
const redeSocialSchema = z.object({
  plataforma: z.enum(['linkedin', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'outro']),
  url: z.string().url('URL inválida'),
  id: z.string().optional(), // Para controle do useFieldArray
})

export type RedeSocial = z.infer<typeof redeSocialSchema>

// Schema para arquivos (validação básica, detalhes no componente de upload)
const fileSchema = z
  .instanceof(File)
  .optional()
  .nullable()
  .refine(
    (file) => {
      if (!file) return true
      return file.size <= 5 * 1024 * 1024 // 5MB
    },
    { message: 'Arquivo deve ter no máximo 5MB' }
  )

const imageFileSchema = z
  .instanceof(File)
  .optional()
  .nullable()
  .refine(
    (file) => {
      if (!file) return true
      return file.size <= 2 * 1024 * 1024 // 2MB
    },
    { message: 'Imagem deve ter no máximo 2MB' }
  )
  .refine(
    (file) => {
      if (!file) return true
      return ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml'].includes(
        file.type
      )
    },
    { message: 'Formato de imagem inválido (apenas JPG, PNG, GIF, SVG)' }
  )

const pdfFileSchema = z
  .instanceof(File)
  .optional()
  .nullable()
  .refine(
    (file) => {
      if (!file) return true
      return file.size <= 10 * 1024 * 1024 // 10MB
    },
    { message: 'PDF deve ter no máximo 10MB' }
  )
  .refine(
    (file) => {
      if (!file) return true
      return file.type === 'application/pdf'
    },
    { message: 'Arquivo deve ser um PDF' }
  )

export const startupEditSchema = z.object({
  // ===== SEÇÃO 1: INFORMAÇÕES BÁSICAS =====
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  nome_fantasia: z.string().max(200, 'Nome fantasia muito longo').optional(),
  cnpj: z.string().min(18, 'CNPJ inválido').regex(cnpjRegex, 'Formato de CNPJ inválido'),
  data_fundacao: z.string().min(1, 'Data de fundação é obrigatória'),
  pais: z.string().min(1, 'País é obrigatório'),
  logo: imageFileSchema,
  site: z.string().url('URL inválida').optional().or(z.literal('')),

  // ===== SEÇÃO 2: CLASSIFICAÇÃO E MERCADO =====
  area_atuacao: z.string().min(1, 'Área de atuação é obrigatória'),
  estagio: z.string().min(1, 'Estágio é obrigatório'),
  descritivo_basico: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  imagem_marketplace: imageFileSchema,

  // ===== SEÇÃO 3: APRESENTAÇÃO E PITCH =====
  descricao_objetivo: z
    .string()
    .min(20, 'Descrição do objetivo deve ter pelo menos 20 caracteres')
    .max(2000, 'Descrição muito longa'),
  video_pitch: z
    .string()
    .refine(
      (url) => {
        if (!url) return true
        return youtubeUrlRegex.test(url)
      },
      { message: 'URL do YouTube inválida' }
    )
    .optional()
    .or(z.literal('')),
  pitch_pdf: pdfFileSchema,
  redes_sociais: z.array(redeSocialSchema).default([]),

  // ===== SEÇÃO 4: INVESTIMENTO =====
  meta_captacao: z
    .number()
    .refine((val) => val === 0 || (val >= 100000.0 && val <= 15000000.0), {
      message: 'Meta de captação deve ser 0 ou entre R$ 100.000,00 e R$ 15.000.000,00',
    }),
  equity_oferecido: z
    .number()
    .min(0.1, 'Equity mínimo é 0.1%')
    .max(100, 'Equity máximo é 100%'),
  // valuation é calculado, não validado

  // ===== SEÇÃO 5: DOCUMENTAÇÃO KYB =====
  comprovante_situacao_cadastral: fileSchema,
  contrato_social: fileSchema,
  documento_mvp: fileSchema,
  certificado_registro_software_patente: fileSchema,
  certificado_direitos_autorais: fileSchema,
  contrato_confidencialidade: fileSchema,
  planejamento_estrategico: fileSchema,
  mapeamento_processos_internos: fileSchema,
  mapeamento_riscos_juridicos_operacionais: fileSchema,
})

export type StartupEditFormData = z.infer<typeof startupEditSchema>

// Valores padrão para o formulário
export const startupEditDefaultValues: StartupEditFormData = {
  nome: '',
  nome_fantasia: '',
  cnpj: '',
  data_fundacao: '',
  pais: 'BRA',
  logo: null,
  site: '',
  area_atuacao: '',
  estagio: '',
  descritivo_basico: '',
  imagem_marketplace: null,
  descricao_objetivo: '',
  video_pitch: '',
  pitch_pdf: null,
  redes_sociais: [],
  meta_captacao: 100000.0,
  equity_oferecido: 0,
  comprovante_situacao_cadastral: null,
  contrato_social: null,
  documento_mvp: null,
  certificado_registro_software_patente: null,
  certificado_direitos_autorais: null,
  contrato_confidencialidade: null,
  planejamento_estrategico: null,
  mapeamento_processos_internos: null,
  mapeamento_riscos_juridicos_operacionais: null,
}
