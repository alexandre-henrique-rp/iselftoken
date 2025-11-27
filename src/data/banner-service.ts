import fs from 'fs';
import path from 'path';

export interface Banner {
  id: number;
  image: string;
  title: string;
}

export async function getBannersFromFolder(): Promise<Banner[]> {
  try {
    const bannersDirectory = path.join(process.cwd(), 'public/banes');

    // Verifica se o diretório existe
    if (!fs.existsSync(bannersDirectory)) {
      console.warn('Diretório de banners não encontrado:', bannersDirectory);
      return [];
    }

    const filenames = fs.readdirSync(bannersDirectory);

    const banners = filenames
      .filter((file) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file))
      .map((file, index) => ({
        id: index + 1,
        image: `/banes/${file}`,
        title: 'Oportunidade Exclusiva iSelfToken', // Título genérico ou baseado no nome do arquivo
      }));

    return banners;
  } catch (error) {
    console.error('Erro ao ler banners:', error);
    return [];
  }
}
