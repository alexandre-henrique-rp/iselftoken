import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FinancialInfoProps {
  targetAmount: number;
  currentAmount: number;
  percentage: number;
}

// Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function FinancialInfo({ targetAmount, currentAmount, percentage }: FinancialInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Meta de Captação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(targetAmount)}</p>
        </div>
        
        <div className="w-full">
          <Progress value={percentage} className="h-3" />
        </div>

        <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
          <p>
            <span className="font-semibold">{formatCurrency(currentAmount)}</span> Captado
          </p>
          <p className="font-semibold">{percentage.toFixed(2)}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
