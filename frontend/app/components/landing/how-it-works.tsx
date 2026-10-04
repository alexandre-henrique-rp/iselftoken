import { Link } from "react-router";
import { Rocket, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";

const founderBenefits = [
  "Abra sua rodada de captação de forma simples e estruturada.",
  "Ofereça participação no negócio por meio de tokens de equity.",
  "Apresente sua startup a uma comunidade de potenciais investidores.",
];

const investorBenefits = [
  "Encontre oportunidades de investimento em startups selecionadas.",
  "Invista a partir de valores acessíveis e diversifique seu portfólio.",
  "Acompanhe seus investimentos e a evolução das empresas pela plataforma.",
];

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-20 px-6 md:px-12 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-3xl lg:text-4xl font-black mb-10 lg:mb-12 tracking-tighter text-center">
          Como Funciona?
        </h3>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          <div className="bg-card p-6 lg:p-8 rounded-[2rem] border-l-4 border-primary/50 group hover:bg-accent transition-colors">
            <Rocket className="w-10 h-10 lg:w-12 lg:h-12 text-primary mb-5" />
            <h4 className="text-xl lg:text-2xl font-bold mb-5">Para Fundadores</h4>
            <p className="text-sm lg:text-base text-muted-foreground mb-5">
              Capte recursos para acelerar o crescimento da sua startup.
            </p>
            <ul className="space-y-3">
              {founderBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm lg:text-base text-muted-foreground">{benefit}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                to="/register"
                className="text-primary font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform text-sm lg:text-base"
              >
                Cadastrar minha startup <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-card p-6 lg:p-8 rounded-[2rem] border-l-4 border-primary/50 group hover:bg-accent transition-colors">
            <TrendingUp className="w-10 h-10 lg:w-12 lg:h-12 text-primary mb-5" />
            <h4 className="text-xl lg:text-2xl font-bold mb-5">Para Investidores</h4>
            <p className="text-sm lg:text-base text-muted-foreground mb-5">
              Invista em startups e participe do crescimento de novos negócios.
            </p>
            <ul className="space-y-3">
              {investorBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm lg:text-base text-muted-foreground">{benefit}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                to="/register"
                className="text-primary font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform text-sm lg:text-base"
              >
                Explorar oportunidades <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
