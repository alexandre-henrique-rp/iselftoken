// Tipos compartilhados para componentes do investidor
// Nomes em inglês para código, domínios em português

export type AppItem = {
  id: string;
  name: string;
  categories: string[];
  rating: number;
  rank: number;
};

export type ProductItem = AppItem & {
  price?: string;
  tag?: string; // Ex.: "Novo", "-20%"
};
