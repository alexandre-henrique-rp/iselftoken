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

// O serviço é exportado como uma instância singleton, não como classe

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
          const temDados = CheckoutStorageService.existeDadosCheckout();
          if (!temDados) {
            console.log('Pagamento concluído ou cancelado');
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Erro ao abrir checkout:', error);

      if (onCheckoutError) {
        onCheckoutError(
          error instanceof Error ? error.message : 'Erro desconhecido',
        );
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
