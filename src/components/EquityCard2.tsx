'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Share2, Copy } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

interface EquityInfo2Props {
  affiliateToken?: string;
  userRole?: 'investidor' | 'startup' | 'admin' | 'afiliado';
  isAuthenticated: boolean;
}

export default function EquityCard2({ affiliateToken, userRole, isAuthenticated }: EquityInfo2Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBuyToken = () => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      // Lógica para redirecionar para a página de compra
      // Se affiliateToken existir, ele será incluído na lógica de compra
      const purchaseUrl = affiliateToken ? `/comprar?token=${affiliateToken}` : '/comprar';
      toast.info(`Redirecionando para a compra... Token de afiliado: ${affiliateToken || 'Nenhum'}`);
      // router.push(purchaseUrl); // Descomentar quando a página de compra existir
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${pathname}?token=${affiliateToken || 'SEU_TOKEN_AQUI'}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link de afiliado copiado para a área de transferência!');
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        {userRole === 'afiliado' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seu Link de Afiliado</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={`${pathname}?token=...`}
                className="flex-grow rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
              />
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          onClick={handleBuyToken}
        >
          Comprar Token
        </Button>
      </CardContent>
    </Card>
  );
}
