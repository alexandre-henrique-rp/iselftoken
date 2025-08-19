/**
 * Template de texto simples (fallback)
 */
export default function buildA2fTextTemplate({ code, appName }: { code: string; appName: string }) {
  return `Seu código de verificação ${appName}: ${code}\n\nEste código expira em poucos minutos. Se você não solicitou, ignore este e-mail.`
}
