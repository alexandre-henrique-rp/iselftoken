
import CheckoutStorageService from '@/services/CheckoutStorageService';
import { AdditionalService, CheckoutData } from '@/types/Checkout';

interface CheckoutProps {
  userName: string;
  userId: string;
  valor: string;
  productName: string;
  productType: string;
  productDescription: string;
  quantidade?: number;
  validity?: number;
  obs?: string;
  addServicesDescription?: AdditionalService[];
}

/**
 * Componente para abrir o checkout em uma nova janela
 * 
 * @param props Dados do produto para checkout
 * @returns void - Abre uma nova janela com o checkout
 */
export default function Checkout({
  userName,
  userId,
  valor,
  productName,
  productType,
  productDescription,
  quantidade,
  validity,
  obs,
  addServicesDescription = [],
}: CheckoutProps) {
  // Cria objeto com dados completos do checkout
  const checkoutData: CheckoutData = {
    userName,
    userId,
    valor,
    productName,
    productType,
    productDescription,
    quantidade,
    validity,
    obs,
    addServicesDescription,
  };

  // Salva dados no localStorage usando o serviço
  CheckoutStorageService.salvarDadosCheckout(checkoutData);

  // Calcula posição centralizada da janela
  const windowWidth = 1025;
  const windowHeight = 768;
  const windowLeft = window.screenX + (window.outerWidth - windowWidth) / 2;
  const windowTop = window.screenY + (window.outerHeight - windowHeight) / 2;

  // Abre nova janela com checkout
  const checkoutWindow = window.open(
    '/checkout',
    'Checkout',
    `width=${windowWidth},height=${windowHeight},left=${windowLeft},top=${windowTop},resizable=yes,scrollbars=yes`
  );

  // Foco na nova janela
  if (checkoutWindow) {
    checkoutWindow.focus();
  }

  console.log('🛒 Checkout aberto com dados:', checkoutData);

  // Retorna a referência da janela para monitoramento
  return checkoutWindow;
}
