/**
 * Hook de validacao de arquivos para upload.
 * Fornece validacao de tamanho (max 50MB) e tipo MIME (PDF only).
 * Nao faz IO - apenas validacao local sincrona.
 *
 * @example
 * const { validateFile } = useFileValidation();
 * const result = validateFile(file);
 * if (!result.ok) toast.error(result.message);
 */
// File is a built-in browser type

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export interface ValidationResult {
  ok: true;
}

export interface ValidationError {
  ok: false;
  message: string;
}

export type FileValidationResult = ValidationResult | ValidationError;

/**
 * Valida o tamanho do arquivo.
 * Limite: 50MB.
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_SIZE_BYTES) {
    return {
      ok: false,
      message: "Arquivo excede o limite de 50MB.",
    };
  }
  return { ok: true };
}

/**
 * Valida o tipo MIME do arquivo contra uma lista de tipos aceitos.
 * Extensao .pdf requer que o MIME tambem seja application/pdf (anti-spoofing).
 *
 * @param file - Arquivo a validar.
 * @param accept - Lista de tipos aceitos separada por virgulas (ex: "application/pdf,.pdf").
 */
export function validateFileType(
  file: File,
  accept: string,
): FileValidationResult {
  const acceptParts = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // Separa extensiones (.pdf) de MIME types (application/pdf)
  const acceptExtensions = acceptParts.filter((t) => t.startsWith("."));
  const acceptMimes = acceptParts.filter((t) => !t.startsWith("."));

  const fileNameLower = file.name.toLowerCase();
  const fileTypeLower = file.type.toLowerCase();

  // Se tem extensao .pdf no accept, exige MIME = application/pdf ou MIME vazio (anti-spoofing)
  if (acceptExtensions.some((ext) => fileNameLower.endsWith(ext))) {
    if (fileTypeLower === "application/pdf" || fileTypeLower === "") {
      return { ok: true };
    }
    // Extensao confere mas MIME nao - possivel spoofing
    return {
      ok: false,
      message: "Apenas arquivos PDF sao aceitos.",
    };
  }

  // Para MIME types sem extensao especifica, compara diretamente
  if (acceptMimes.some((mime) => fileTypeLower === mime)) {
    return { ok: true };
  }

  return {
    ok: false,
    message: "Apenas arquivos PDF sao aceitos.",
  };
}

/**
 * Valida arquivo combinando tamanho e tipo.
 * Retorna o primeiro erro encontrado (size primeiro, depois tipo).
 */
export function validateFile(file: File): FileValidationResult {
  const sizeResult = validateFileSize(file);
  if (!sizeResult.ok) return sizeResult;

  const typeResult = validateFileType(file, "application/pdf,.pdf");
  if (!typeResult.ok) return typeResult;

  return { ok: true };
}
