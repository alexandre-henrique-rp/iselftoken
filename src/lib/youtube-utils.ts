/**
 * Extrai o ID de um vídeo do YouTube a partir de uma URL.
 * Suporta vários formatos de URL (youtube.com, youtu.be, etc.).
 * @param url A URL do vídeo do YouTube.
 * @returns O ID do vídeo ou null se não for encontrado.
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  } else {
    return null;
  }
}
