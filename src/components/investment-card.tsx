import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecentInvestment } from "@/data/profile";

interface InvestmentCardProps {
  investment: RecentInvestment;
}

// Card simples para exibir um investimento recente, alinhado ao estilo do profile.tsx
export function InvestmentCard({ investment }: InvestmentCardProps) {
  const isPositive = investment.roi.trim().startsWith("+");
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{investment.startup}</CardTitle>
        <CardDescription>{investment.date}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-medium">{investment.amount}</p>
          <div className="flex items-center gap-2">
            <Badge variant={investment.status === "Ativo" ? "default" : "secondary"}>
              {investment.status}
            </Badge>
            <span className={isPositive ? "text-sm text-green-500" : "text-sm text-red-500"}>
              {investment.roi}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
