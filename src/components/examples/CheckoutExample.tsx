import Checkout from '@/components/chekout';
import { AdditionalService } from '@/types/Checkout';

/**
 * Exemplo de uso do componente Checkout com todas as funcionalidades
 *
 * Este exemplo demonstra como utilizar o checkout com:
 * - Dados obrigatórios
 * - Serviços adicionais
 * - Dados opcionais
 */
export default function CheckoutExample() {
  // Exemplo 1: Plano básico sem serviços adicionais
  const handleBasicPlan = () => {
    Checkout({
      userName: 'João Silva',
      userId: 'usr_12345',
      valor: 'R$ 99,90',
      productName: 'Plano Básico',
      productType: 'plano',
      productDescription: 'Acesso básico à plataforma',
      validity: 1,
      obs: 'Renovação automática',
    });
  };

  // Exemplo 2: Plano premium com serviços adicionais
  const handlePremiumPlan = () => {
    const servicosAdicionais: AdditionalService[] = [
      {
        description: 'Suporte Prioritário 24/7',
        value: 49.9,
      },
      {
        description: 'Backup Automático Diário',
        value: 19.9,
      },
      {
        description: 'Relatórios Avançados',
        value: 29.9,
      },
    ];

    Checkout({
      userName: 'Maria Santos',
      userId: 'usr_67890',
      valor: 'R$ 299,90',
      productName: 'Plano Premium',
      productType: 'plano',
      productDescription: 'Acesso completo com todos os recursos',
      validity: 12,
      obs: 'Economia de 20% no pagamento anual',
      addServicesDescription: servicosAdicionais,
    });
  };

  // Exemplo 3: Consultoria avulsa
  const handleConsulting = () => {
    Checkout({
      userName: 'Carlos Oliveira',
      userId: 'usr_54321',
      valor: 'R$ 1.500,00',
      productName: 'Consultoria de Transformação Digital',
      productType: 'consultoria',
      productDescription: 'Análise completa e planejamento estratégico',
      validity: 3,
      obs: 'Inclui 3 sessões de 2 horas',
    });
  };

  // Exemplo 4: Token especial com múltiplos serviços
  const handleTokenSpecial = () => {
    const servicosEspeciais: AdditionalService[] = [
      {
        description: 'Token Exclusivo Premium',
        value: 500.0,
      },
      {
        description: 'Certificado Digital',
        value: 150.0,
      },
      {
        description: 'Wallet Segura',
        value: 89.9,
      },
      {
        description: 'Taxa de Manutenção Anual',
        value: 99.9,
      },
    ];

    Checkout({
      userName: 'Ana Costa',
      userId: 'usr_98765',
      valor: 'R$ 2.000,00',
      productName: 'Token iSelf Premium',
      productType: 'token',
      productDescription: 'Token digital exclusivo com benefícios premium',
      validity: 12,
      obs: 'Limite de 100 unidades disponíveis',
      addServicesDescription: servicosEspeciais,
    });
  };

  return (
    <div className="space-y-4 p-8">
      <h1 className="mb-6 text-2xl font-bold">Exemplos de Checkout</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={handleBasicPlan}
          className="rounded-lg border p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold">Plano Básico</h3>
          <p className="text-sm text-gray-600">R$ 99,90/mês</p>
          <p className="text-xs text-gray-500">
            Acesso básico sem serviços adicionais
          </p>
        </button>

        <button
          onClick={handlePremiumPlan}
          className="rounded-lg border p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold">Plano Premium</h3>
          <p className="text-sm text-gray-600">R$ 399,60/ano + serviços</p>
          <p className="text-xs text-gray-500">
            Acesso completo com 3 serviços adicionais
          </p>
        </button>

        <button
          onClick={handleConsulting}
          className="rounded-lg border p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold">Consultoria</h3>
          <p className="text-sm text-gray-600">R$ 1.500,00</p>
          <p className="text-xs text-gray-500">
            Pacote de consultoria de 3 meses
          </p>
        </button>

        <button
          onClick={handleTokenSpecial}
          className="rounded-lg border p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold">Token Premium</h3>
          <p className="text-sm text-gray-600">R$ 2.839,80 total</p>
          <p className="text-xs text-gray-500">
            Token exclusivo com 4 serviços adicionais
          </p>
        </button>
      </div>

      <div className="mt-8 rounded-lg bg-gray-100 p-4">
        <h3 className="mb-2 font-semibold">Cupons de Teste:</h3>
        <ul className="space-y-1 text-sm">
          <li>
            • <code>DESCONTO10</code> - 10% de desconto
          </li>
          <li>
            • <code>DESCONTO20</code> - 20% de desconto
          </li>
          <li>
            • <code>FIXO50</code> - R$ 50 de desconto fixo
          </li>
          <li>
            • <code>PROMO2025</code> - 15% de desconto especial
          </li>
        </ul>
      </div>
    </div>
  );
}
