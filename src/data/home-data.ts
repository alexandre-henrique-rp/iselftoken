
export interface Startup {
  id: number;
  name: string;
  logo: string;
  image: string;
  description: string;
  selos: string[];
  videoUrl?: string;
}

const generateMockStartups = (count: number, baseName: string): Startup[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${baseName} ${i + 1}`,
    logo: `https://elements-resized.envatousercontent.com/elements-cover-images/1b61fe0b-8639-4748-aaf1-e0e45f50c8c1?w=2038&cf_fit=scale-down&q=85&format=auto&s=5b368b136e2ed7984c318b0399c1da86d4afd5954fd13ad7ae276d9dec8a6fd6`,
    image: `/image-0${(i % 5) + 1}.jpg`,
    description: 'Uma breve descrição da startup, destacando seu potencial e inovação no mercado.',
    selos: ['/selos/startup.svg', '/selos/Vector (1).svg'],
    // Alguns startups terão vídeos demonstrativos
    videoUrl: i % 3 === 0 ? `https://www.youtube.com/embed/dQw4w9WgXcQ` : undefined,
  }));
};

export const getFeaturedStartups = async (): Promise<Startup[]> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return generateMockStartups(15, 'Startup em Destaque');
};

export const getVerifiedStartups = async (): Promise<Startup[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return generateMockStartups(15, 'Startup Verificada');
};

export const getAcceleratedStartups = async (): Promise<Startup[]> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return generateMockStartups(15, 'Startup Acelerada');
};

export const getApprovalPhaseStartups = async (): Promise<Startup[]> => {
  await new Promise(resolve => setTimeout(resolve, 2500));
  return generateMockStartups(15, 'Startup em Aprovação');
};

export const getAdBanners = async (): Promise<{ id: number; image: string; title: string }[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 1, image: '/banes/5306763.jpg', title: 'Publicidade 1' },
    { id: 2, image: '/banes/8041409.jpg', title: 'Publicidade 2' },
    { id: 3, image: '/banes/8045012.jpg', title: 'Publicidade 3' },
  ];
};
