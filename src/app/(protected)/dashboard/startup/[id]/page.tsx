import StartupEditForm from '@/components/forms/StartupEditForm';
import { notFound } from 'next/navigation';

interface EditarStartupPageProps {
  params: Promise<{ id: string }>;
}

// Simulação de busca de dados (substitua pela chamada real à API/Service)
const getStartup = async (id: string) => {
  try {
    // Mock Data based on structure
    // Em produção: const res = await fetch(`${process.env.API_URL}/startup/${id}`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Fake latency

    return {
      id: Number(id),
      nome: 'TechStart Solutions',
      razao_social: 'TechStart Tecnologia LTDA',
      cnpj: '12.345.678/0001-90',
      status: 'Ativa',
      data_fundacao: '2022-05-10',
      area_atuacao: 'Fintech',
      estagio: 'MVP',
      logo_url: '',
      site: 'https://techstart.com.br',
      descritivo_basico:
        'Uma startup revolucionária focada em pagamentos digitais.',
      pais: { iso3: 'BRA', nome: 'Brasil', emoji: '🇧🇷' },

      // Campanha
      campanha: [
        {
          id: 1,
          status: 'Ativo' as const,
          dt_inicio: '2024-01-15',
          dt_fim: '2024-06-15',
          meta_captacao: 500000,
          equity_oferecido: 10,
        },
      ],

      // Financeiro
      valuation_calculado: 5000000,
      total_captado: 150000,

      // Recursos - Soma = 100%
      recursos: {
        fundados: 20,
        desenvolvimento: 40,
        comercial: 20,
        marketing: 10,
        nuvem: 5,
        juridico: 5,
        reserva: 0,
      },

      // Dados Bancários
      banco: {
        nome: 'Banco Inter',
        agencia: '0001',
        conta: '12345-6',
        tipo: 'Conta Corrente' as const,
        nome_titular: 'TechStart Tecnologia LTDA',
      },

      // Pitch e Descritivos
      problema:
        'O mercado atual enfrenta dificuldades com processos de pagamento complexos e taxas elevadas.',
      solucao:
        'Nossa plataforma oferece uma solução integrada de pagamentos com taxas competitivas e interface intuitiva.',
      diferencial:
        'Tecnologia proprietária de processamento em tempo real e sistema de prevenção a fraudes baseado em IA.',
      modelo_receita:
        'Taxa por transação (2,5%) + Assinatura premium para funcionalidades avançadas.',
      mercado_alvo: 'PMEs do setor de e-commerce e varejo digital no Brasil.',
      compradores: 'Empresas de e-commerce, marketplaces e varejistas online.',

      // Mídia e Documentos
      pdf_url: 'https://storage.example.com/techstart/pitch-deck.pdf',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

      // Sócios
      socios: [
        { id: 1, nome: 'João Silva', porcentagem: 60, percentual_time: '100%' },
        {
          id: 2,
          nome: 'Maria Souza',
          porcentagem: 40,
          percentual_time: '100%',
        },
      ],

      // Time
      teams: [
        { id: 1, nome: 'Carlos Dev', cargo: 'CTO', foto_url: '' },
        { id: 2, nome: 'Ana Designer', cargo: 'Head of Design', foto_url: '' },
      ],

      // Redes Sociais
      redes: [
        {
          id: 1,
          nome: 'LinkedIn',
          url: 'https://linkedin.com/company/techstart',
        },
        { id: 2, nome: 'Instagram', url: 'https://instagram.com/techstart' },
      ],

      // Selos e Certificações
      selos: [
        { id: 1, nome: 'Startup Brasil', url: 'https://startupbrasil.gov.br' },
      ],

      // Configurações e Benefícios
      part_lucro: true,
      part_lucro_regras:
        'Distribuição trimestral proporcional ao investimento após atingir breakeven.',
      beneficios: true,
      beneficios_regras:
        'Acesso a plataforma premium + consultoria trimestral + desconto de 20% nos serviços.',
      termos: true,
      repasse: true,

      // Prêmios
      premio: true,
      premio_dt: '2023-11-20',
      premio_pg: 'Melhor Startup Fintech - Prêmio Inovação Digital 2023',

      // Status
      ativo: 'ativo', // Status cliente
      ativo_adm: 'aprovado', // Status admin
    };
  } catch {
    return null;
  }
};

export default async function EditarStartupPage({
  params,
}: EditarStartupPageProps) {
  const { id } = await params;
  const startup = await getStartup(id);

  if (!startup) {
    notFound();
  }

  return <StartupEditForm initialData={startup} />;
}
