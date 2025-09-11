import { Card, CardContent } from '@/components/ui/card';
import { Users, PieChart, Package } from 'lucide-react';

interface EquityInfo1Props {
  totalEquity: number;
  remainingTokens: number;
  totalInvestors: number;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};


const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
  <div className="flex items-center gap-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default function EquityCard1({ totalEquity, remainingTokens, totalInvestors }: EquityInfo1Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <InfoItem 
          icon={PieChart} 
          label="Equity Ofertado"
          value={`${totalEquity}%`}
        />
        <InfoItem 
          icon={Package} 
          label="Tokens Restantes"
          value={formatNumber(remainingTokens)}
        />
        <InfoItem 
          icon={Users} 
          label="Total de Investidores"
          value={formatNumber(totalInvestors)}
        />
      </CardContent>
    </Card>
  );
}
