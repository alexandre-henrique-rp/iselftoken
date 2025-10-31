export const dynamic = 'force-dynamic'
import { Metadata } from 'next'
import { Rocket, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StartupForm } from '@/components/dashboard_startup/startup-form'

export const metadata: Metadata = {
  title: 'Nova Startup | iSelfToken',
  description: 'Cadastre uma nova startup na plataforma',
}

/**
 * Renderiza a página de cadastro de startups com um layout de onboarding que contextualiza o processo e apresenta o formulário principal.
 */
export default function NovaStartupPage() {


  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(213,0,249,0.12),transparent_55%)]" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
                Cadastro de Startup
              </Badge>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Construa uma apresentação memorável para atrair investidores
              </h1>
              <p className="text-lg text-muted-foreground">
                Organize as principais informações da sua operação, destaque diferenciais e defina os objetivos da rodada para que o seu projeto se destaque no marketplace da iSelfToken.
              </p>
            </div>

            <Card className="border-none bg-background/85 shadow-lg shadow-primary/5 backdrop-blur">
              <CardHeader className="space-y-3 pb-0">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Rocket className="h-5 w-5 text-primary" />
                  Por que começar agora?
                </CardTitle>
                <CardDescription>
                  Um perfil completo aumenta em média 3,4x as chances de captação bem-sucedida.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Narrativa clara do produto</p>
                    <p>Mostre o problema resolvido, diferenciais competitivos e estágio atual da solução.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Projeções de crescimento</p>
                    <p>Detalhe resultados, marcos operacionais e a visão para os próximos 12 meses.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Planejamento da rodada</p>
                    <p>Defina meta de captação, equity ofertado e o plano de alocação dos recursos.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-dashed border-primary/20 bg-background/70 backdrop-blur">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Checklist rápido
                </CardTitle>
                <CardDescription>
                  Garanta que você tem os dados necessários antes de iniciar o preenchimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <li className="rounded-lg border border-border/60 bg-background/60 p-3">
                    Dados cadastrais atualizados (CNPJ, data de fundação, país)
                  </li>
                  <li className="rounded-lg border border-border/60 bg-background/60 p-3">
                    Descrição objetiva da proposta de valor e área de atuação
                  </li>
                  <li className="rounded-lg border border-border/60 bg-background/60 p-3">
                    Estágio atual do negócio e principais métricas alcançadas
                  </li>
                  <li className="rounded-lg border border-border/60 bg-background/60 p-3">
                    Objetivo da rodada, meta de captação e equity ofertado
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="flex flex-col gap-1 text-left">
                <span className="font-medium text-foreground">Segurança em primeiro lugar</span>
                <span>Suas informações são criptografadas e você pode atualizar o cadastro quando precisar.</span>
              </div>
            </div>
          </div>

          <Card className="border-none bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur">
            <CardHeader className="space-y-2 pb-2">
              <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-xs font-medium uppercase tracking-wide text-primary">
                Etapa 1 de 2
              </Badge>
              <CardTitle className="text-2xl font-semibold text-foreground">
                Informações da startup
              </CardTitle>
              <CardDescription>
                Preencha os dados essenciais para que possamos preparar sua vitrine de investimentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <StartupForm mode="create" />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}