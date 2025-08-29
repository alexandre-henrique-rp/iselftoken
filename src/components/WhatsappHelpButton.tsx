import { IconBrandWhatsapp, IconHelp } from "@tabler/icons-react"

/**
 * WhatsappHelpButton
 * Botão flutuante com estilo WhatsApp. Exibe um "?" branco por padrão e,
 * ao passar o mouse, troca para o ícone do WhatsApp. Possui borda interna branca fina.
 */
export function WhatsappHelpButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        aria-label="Ajuda via WhatsApp"
        className="group rounded-full bg-[#25D366] p-1 shadow-lg transition-transform hover:scale-105 focus:outline-none touch-manipulation"
      >
        <div className="relative flex items-center justify-center rounded-full border-2 sm:border-4 border-white bg-[#25D366] p-2 sm:p-3">
          {/* Conteúdo padrão: ícone de ajuda (traço mais grosso) */}
          <IconHelp
            className="transition-opacity duration-150 group-hover:opacity-0"
            color="#FFFFFF"
            stroke={2.5}
            size={24}
            aria-hidden
          />
          {/* Ícone WhatsApp no hover */}
          <IconBrandWhatsapp
            className="absolute inset-0 m-auto text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            stroke={2.5}
            size={24}
            aria-hidden
          />
        </div>
      </button>
    </div>
  )
}
