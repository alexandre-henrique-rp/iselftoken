/**
 * Exemplo de Componente que utiliza o Sistema de Checkout
 *
 * Este arquivo serve como referência de implementação para usar
 * o CheckoutStorageService e abrir a página de checkout.
 *
 * @see /CHECKOUT.md para documentação completa
 */

'use client';

import { useState } from 'react';
import CheckoutStorageService from '@/services/CheckoutStorageService';
import { CheckoutData } from '@/types/Checkout';

interface ExampleProduct {
  id: string;
  name: string;
  type: string;
  price: string;
  description: string;
  validity?: number;
  obs?: string;
}

interface CheckoutButtonExampleProps {
  /**
   * Dados do usuário atual
   */
  user: {
    id: string;
    name: string;
  };

  /**
   * Produto a ser comprado
   */
  product: ExampleProduct;

  /**
   * Callback opcional após abrir checkout
   */
  onCheckoutOpened?: () => void;

  /**
   * Callback opcional se falhar
   */
  onCheckoutError?: (error: string) => void;
}

/**
 * Componente de exemplo que demonstra como usar o checkout
 */
export default function CheckoutButtonExample({
  user,
  product,
  onCheckoutOpened,
  onCheckoutError,
}: CheckoutButtonExampleProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenCheckout = () => {
    try {
      setIsLoading(true);

      // 1. Preparar dados do checkout
      const checkoutData: CheckoutData = {
        userName: user.name,
        userId: user.id,
        valor: product.price,
        productName: product.name,
        productType: product.type,
        productDescription: product.description,
        validity: product.validity,
        obs: product.obs,
      };

      // 2. Abrir checkout em nova janela (1024x768 por padrão)
      const checkoutWindow = CheckoutStorageService.abrirCheckout(checkoutData);

      // 3. Verificar se a janela foi aberta
      if (!checkoutWindow) {
        throw new Error('Não foi possível abrir a janela de checkout');
      }

      // 4. Callback de sucesso
      if (onCheckoutOpened) {
        onCheckoutOpened();
      }

      // 5. Opcional: Monitorar se a janela foi fechada
      const checkWindowClosed = setInterval(() => {
        if (checkoutWindow.closed) {
          clearInterval(checkWindowClosed);
          console.log('Janela de checkout foi fechada');

          // Você pode verificar se o pagamento foi concluído
          const temDados = CheckoutStorageService.temDadosCheckout();
          if (!temDados) {
            console.log('Pagamento concluído ou cancelado');
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Erro ao abrir checkout:', error);

      if (onCheckoutError) {
        onCheckoutError(error instanceof Error ? error.message : 'Erro desconhecido');
      } else {
        alert('Erro ao abrir checkout. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleOpenCheckout}
      disabled={isLoading}
      className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {isLoading ? 'Abrindo checkout...' : 'Comprar Agora'}
    </button>
  );
}

/**
 * ============================================
 * EXEMPLO DE USO EM UMA PÁGINA
 * ============================================
 */

/*

'use client';

import { useSession } from '@/hooks/useSession';
import CheckoutButtonExample from '@/components/examples/CheckoutButtonExample';

export default function ProductPage() {
  const { session } = useSession();

  const product = {
    id: 'prod_123',
    name: 'Plano Premium',
    type: 'assinatura',
    price: 'R$ 1.500,00',
    description: 'Acesso completo à plataforma por 12 meses',
    validity: 12,
    obs: 'Inclui suporte técnico 24/7',
  };

  if (!session) {
    return <p>Faça login para comprar</p>;
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>Preço: {product.price}</p>

      <CheckoutButtonExample
        user={{
          id: session.user.id,
          name: session.user.name,
        }}
        product={product}
        onCheckoutOpened={() => {
          console.log('Checkout aberto com sucesso!');
          // Você pode fazer tracking aqui
        }}
        onCheckoutError={(error) => {
          console.error('Erro:', error);
          // Você pode fazer log de erro aqui
        }}
      />
    </div>
  );
}

*/

/**
 * ============================================
 * EXEMPLO 2: LISTA DE PLANOS
 * ============================================
 */

/*

'use client';

import { useSession } from '@/hooks/useSession';
import CheckoutStorageService from '@/services/CheckoutStorageService';
import { CheckoutData } from '@/types/Checkout';

const plans = [
  {
    name: 'Básico',
    price: 'R$ 97,00',
    validity: 1,
    features: ['1000 tokens', 'Suporte básico'],
  },
  {
    name: 'Premium',
    price: 'R$ 997,00',
    validity: 12,
    features: ['10000 tokens', 'Suporte prioritário', 'API ilimitada'],
  },
];

export default function PlansPage() {
  const { session } = useSession();

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (!session) {
      alert('Faça login para continuar');
      return;
    }

    const checkoutData: CheckoutData = {
      userName: session.user.name,
      userId: session.user.id,
      valor: plan.price,
      productName: `Plano ${plan.name}`,
      productType: 'assinatura',
      productDescription: `Acesso por ${plan.validity} ${plan.validity === 1 ? 'mês' : 'meses'}`,
      validity: plan.validity,
      obs: plan.features.join(', '),
    };

    CheckoutStorageService.abrirCheckout(checkoutData);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {plans.map((plan) => (
        <div key={plan.name} className="rounded-lg border p-6">
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          <p className="text-3xl font-light">{plan.price}</p>
          <ul className="my-4">
            {plan.features.map((feature) => (
              <li key={feature}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={() => handleSelectPlan(plan)}
            className="w-full rounded-lg bg-purple-600 py-3 text-white"
          >
            Selecionar Plano
          </button>
        </div>
      ))}
    </div>
  );
}

*/

/**
 * ============================================
 * EXEMPLO 3: COMPRA RÁPIDA (INLINE)
 * ============================================
 */

/*

'use client';

import { useState } from 'react';
import CheckoutStorageService from '@/services/CheckoutStorageService';

export default function QuickBuyButton({ userId, userName }: { userId: string; userName: string }) {
  const [quantity, setQuantity] = useState(1);

  const handleQuickBuy = () => {
    const totalPrice = quantity * 100; // R$ 100 por unidade

    CheckoutStorageService.abrirCheckout({
      userName,
      userId,
      valor: `R$ ${totalPrice.toFixed(2).replace('.', ',')}`,
      productName: `${quantity} Pacote${quantity > 1 ? 's' : ''} de Tokens`,
      productType: 'token',
      productDescription: `${quantity * 1000} tokens para uso na plataforma`,
    });
  };

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min="1"
        max="10"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
        className="w-20 rounded border px-2"
      />
      <button
        onClick={handleQuickBuy}
        className="rounded bg-purple-600 px-4 py-2 text-white"
      >
        Comprar {quantity}x (R$ {(quantity * 100).toFixed(2).replace('.', ',')})
      </button>
    </div>
  );
}

*/
