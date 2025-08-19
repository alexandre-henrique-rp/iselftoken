import { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termos de Uso | iSelfToken",
  description: "Leia os Termos de Uso da plataforma iSelfToken.",
}

export default function TermsOfUsePage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <section className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Termos de Uso</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Regras e condições de uso da plataforma iSelfToken.
            </p>
          </div>
        </div>
        <Badge variant="secondary">Atualizado em 15/08/2025</Badge>
      </section>

      {/* Layout em Grid com Sidebar */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Conteúdo principal */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Leia atentamente cada seção
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
          <section>
            <h2 id="introducao">1. Introdução</h2>
            <p>
              Bem-vindo à plataforma iSelfToken. Ao acessar e utilizar nossos serviços,
              você concorda com estes Termos de Uso. Leia atentamente antes de
              continuar a navegação.
            </p>
          </section>

          <section>
            <h2 id="aceitacao">2. Aceitação dos Termos</h2>
            <p>
              O uso da plataforma implica a aceitação integral e sem reservas destes
              Termos. Caso você não concorde com qualquer condição aqui prevista,
              recomendamos que não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 id="cadastro">3. Cadastro e Conta</h2>
            <p>
              Para utilizar determinadas funcionalidades, pode ser necessário criar uma
              conta. Você é responsável por fornecer informações verdadeiras e manter a
              confidencialidade de suas credenciais.
            </p>
          </section>

          <section>
            <h2 id="uso-permitido">4. Uso Permitido</h2>
            <p>
              Você se compromete a utilizar a plataforma de acordo com a legislação
              vigente e com estes Termos, abstendo-se de praticar atividades ilícitas,
              abusivas, fraudulentas ou que violem direitos de terceiros.
            </p>
          </section>

          <section>
            <h2 id="propriedade-intelectual">5. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, marcas, logos e elementos da plataforma são protegidos
              por direitos de propriedade intelectual. É proibida a reprodução,
              distribuição ou modificação sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 id="privacidade">6. Privacidade e Proteção de Dados</h2>
            <p>
              O tratamento de dados pessoais observa a legislação aplicável e nossa
              Política de Privacidade. Recomendamos a leitura atenta do documento.
            </p>
          </section>

          <section>
            <h2 id="limitacao">7. Limitação de Responsabilidade</h2>
            <p>
              Não nos responsabilizamos por danos diretos ou indiretos decorrentes do
              uso inadequado da plataforma, indisponibilidade temporária ou eventos de
              força maior.
            </p>
          </section>

          <section>
            <h2 id="modificacoes">8. Modificações destes Termos</h2>
            <p>
              Podemos atualizar estes Termos a qualquer momento. Alterações relevantes
              serão comunicadas por canais apropriados. O uso contínuo após as
              mudanças implica concordância com a versão atualizada.
            </p>
          </section>

          <section>
            <h2 id="contato">9. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos, entre em contato com nosso
              suporte.
            </p>
          </section>

          <section>
            <h2 id="foro">10. Foro</h2>
            <p>
              Fica eleito o foro de sua comarca para dirimir quaisquer controvérsias,
              com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>
          </CardContent>
        </Card>

        {/* Sidebar com Sumário */}
        <aside className="lg:col-span-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sumário</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="text-sm">
                <ul className="space-y-2">
                  <li><Link href="#introducao" className="text-muted-foreground hover:text-foreground">1. Introdução</Link></li>
                  <li><Link href="#aceitacao" className="text-muted-foreground hover:text-foreground">2. Aceitação dos Termos</Link></li>
                  <li><Link href="#cadastro" className="text-muted-foreground hover:text-foreground">3. Cadastro e Conta</Link></li>
                  <li><Link href="#uso-permitido" className="text-muted-foreground hover:text-foreground">4. Uso Permitido</Link></li>
                  <li><Link href="#propriedade-intelectual" className="text-muted-foreground hover:text-foreground">5. Propriedade Intelectual</Link></li>
                  <li><Link href="#privacidade" className="text-muted-foreground hover:text-foreground">6. Privacidade e Proteção de Dados</Link></li>
                  <li><Link href="#limitacao" className="text-muted-foreground hover:text-foreground">7. Limitação de Responsabilidade</Link></li>
                  <li><Link href="#modificacoes" className="text-muted-foreground hover:text-foreground">8. Modificações destes Termos</Link></li>
                  <li><Link href="#contato" className="text-muted-foreground hover:text-foreground">9. Contato</Link></li>
                  <li><Link href="#foro" className="text-muted-foreground hover:text-foreground">10. Foro</Link></li>
                </ul>
              </nav>
              <div className="mt-6">
                <Link href="/" className="text-primary hover:underline">
                  ← Voltar para o início
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
