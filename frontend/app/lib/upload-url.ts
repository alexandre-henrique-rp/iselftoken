export interface UploadUrlSource {
  url_web?: string | null;
  url_md?: string | null;
  url_sm?: string | null;
  url?: string | null;
  url_lg?: string | null;
}

/**
 * Seleciona a URL pública mais econômica para exibição no frontend.
 * A versão web é a fonte principal; os demais campos mantêm compatibilidade
 * com registros antigos e com documentos que não possuem variantes.
 */
export function getUploadWebUrl(
  source?: UploadUrlSource | null,
): string | null {
  return (
    source?.url_web ??
    source?.url_md ??
    source?.url_sm ??
    source?.url ??
    source?.url_lg ??
    null
  );
}

/**
 * Seleciona a fonte para visualização detalhada conforme o contrato do upload:
 * arquivo original (`url`), variante média (`url_md`) e versão web (`url_web`).
 * A validação de protocolo deve ser feita pelo consumidor antes do uso.
 */
export function getUploadFullUrl(
  source?: UploadUrlSource | null,
): string | null {
  return source?.url ?? source?.url_md ?? source?.url_web ?? null;
}
