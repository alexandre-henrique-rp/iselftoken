import { Categories } from '@/data/categoria';
import { OpportunitiesData } from '@/data/oportunidades';
import { ProfileCards } from '@/data/profile';
import { InvestorTestimonials } from '@/data/testemunhos/investidor';
import { StartupTestimonials } from '@/data/testemunhos/startup';
import { Categorias, StartupTypes } from '@/types/ProfileTypes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const opportunitiesData = OpportunitiesData;
    const categoriesData = Categories as Categorias[];
    const investorTestimonials = InvestorTestimonials;
    const startupTestimonials = StartupTestimonials;
    const profileCards = ProfileCards;

    const data: StartupTypes.marketingData = {
      oportunidades: opportunitiesData,
      categorias: categoriesData,
      testemunhosInvestidor: investorTestimonials,
      testemunhosStartup: startupTestimonials,
      campeao: profileCards,
      verificado: profileCards,
      acelerado: profileCards,
      aprovadas: profileCards,
    };    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar startups' },
      { status: 500 },
    );
  }
}
