import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export type Startup = {
  id: string;
  name: string;
  category: string;
  stage: string;
  fundingGoal: string;
  raised: string;
  percentage: number;
  valuation: string;
  investors: number;
  timeLeft: string; // ex: "12 dias"
  image: string;
  description: string;
  trending?: boolean;
};

interface StartupCardProps {
  startup: Startup;
}

// Componente de Card de Startup (Server Component, sem interatividade client-side)
export function StartupCard({ startup }: StartupCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative aspect-[16/9] bg-zinc-800">
          <Image
            src={startup.image}
            alt={startup.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="secondary" className="bg-black/60 text-white border-zinc-700">
              {startup.stage}
            </Badge>
            {startup.trending ? (
              <Badge className="bg-blue-600 text-white">Em alta</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-base font-semibold text-zinc-100">
            {startup.name}
          </CardTitle>
          <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
            {startup.category}
          </Badge>
        </div>
        <CardDescription className="text-sm text-zinc-400 mb-4">
          {startup.description}
        </CardDescription>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Progresso</span>
            <span className="text-zinc-100 font-medium">
              {startup.raised} de {startup.fundingGoal}
            </span>
          </div>
          <Progress value={startup.percentage} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Link href="#">Ver detalhes</Link>
          </Button>
          <Button asChild className="bg-red-600 hover:bg-red-600/90">
            <Link href="/login">Login para Investir</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
