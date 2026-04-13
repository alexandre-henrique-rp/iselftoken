"use client";

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlanIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
    <path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"></path>
  </svg>
);

const Tag = ({ text }) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/15 text-fuchsia-200 text-xs font-bold px-4 py-1 tracking-wider">
    <span className="h-2 w-2 rounded-full bg-fuchsia-400" aria-hidden="true" />
    {text}
  </div>
);

const GetStartedButton = ({ isFeatured, label = "Começar agora" }) => (
  <button
    type="button"
    aria-label={label}
    className={`w-full text-center py-3.5 rounded-lg font-semibold text-sm transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
      isFeatured
        ? "bg-white text-stone-900 hover:text-stone-950 ring-fuchsia-400 ring-offset-fuchsia-400/20"
        : "bg-stone-800 text-stone-100 hover:bg-stone-700 ring-stone-700 ring-offset-stone-950"
    }`}
  >
    {label}
  </button>
);

const FeatureListItem = ({ children, isFeatured }) => (
  <li className="flex items-start gap-3">
    <div
      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
        isFeatured ? "bg-white/20" : "bg-stone-800"
      }`}
    >
      <CheckIcon
        className={`${isFeatured ? "text-white" : "text-stone-200"} w-3.5 h-3.5`}
      />
    </div>
    <span
      className={`text-sm ${isFeatured ? "text-white/90" : "text-stone-300"}`}
    >
      {children}
    </span>
  </li>
);

const Header = () => (
  <header className="relative text-center mb-12 md:mb-20 px-4 z-10">
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl opacity-40 -z-10"
      aria-hidden="true"
    ></div>

    <div
      className="flex justify-center mb-4 animate-fade-in-down"
      style={{ animationDelay: "0.2s" }}
    >
      <Tag text="MAIS DE 1.000.000 DE USUÁRIOS" />
    </div>

    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-stone-50 leading-tight tracking-tight animate-fade-in-down">
      Planos para <br />
      <span className="text-transparent bg-clip-text bg-linear-to-r from-fuchsia-400 to-pink-500">
        times de todos os tamanhos
      </span>
    </h1>

    <p
      className="text-stone-300 mt-6 text-base sm:text-lg max-w-2xl mx-auto animate-fade-in-down"
      style={{ animationDelay: "0.4s" }}
    >
      Escolha o plano ideal para manter suas rodadas organizadas e acelerar a
      jornada na iSelfToken.
    </p>
  </header>
);

const PricingCard = ({
  plan,
  price,
  period,
  description,
  features,
  isFeatured = false,
}) => (
  <article
    className={`relative p-6 md:p-8 rounded-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-2 ${
      isFeatured
        ? "bg-linear-to-b from-fuchsia-500 to-pink-500 text-white shadow-2xl lg:scale-105"
        : "bg-stone-900 text-stone-50 shadow-lg shadow-black/20 border border-stone-800"
    }`}
    aria-label={`Plano ${plan}`}
  >
    {isFeatured && (
      <div className="absolute -top-3 right-6">
        <span className="inline-flex items-center rounded-full bg-white/20 text-white/90 text-xs font-semibold px-3 py-1 backdrop-blur">
          Mais popular
        </span>
      </div>
    )}
    <div className="flex items-center gap-3 mb-6">
      <PlanIcon
        className={`w-5 h-5 ${isFeatured ? "text-white/80" : "text-stone-500"}`}
      />
      <h3
        className={`text-xs font-bold tracking-widest uppercase ${
          isFeatured ? "text-white/80" : "text-stone-500"
        }`}
      >
        {plan}
      </h3>
    </div>

    <div className="mb-6 flex items-baseline gap-1.5">
      <span
        className={`text-4xl sm:text-5xl font-bold ${isFeatured ? "text-white" : "text-stone-50"}`}
      >
        R$ {price}
      </span>
      <span
        className={`${isFeatured ? "text-white/70" : "text-stone-400"} text-sm`}
      >
        {period}
      </span>
    </div>

    <p
      className={`mb-8 min-h-18 text-sm ${isFeatured ? "text-white/85" : "text-stone-300"}`}
    >
      {description}
    </p>

    <div className="mb-8">
      <GetStartedButton isFeatured={isFeatured} label="Começar agora" />
    </div>

    <ul className="space-y-4">
      {features.map((feature, index) => (
        <FeatureListItem key={`${plan}-${index}`} isFeatured={isFeatured}>
          {feature}
        </FeatureListItem>
      ))}
    </ul>
  </article>
);

export default function PricingPlansExample() {
  const pricingPlans = [
    {
      plan: "Essencial",
      price: 199,
      period: "/mês",
      description:
        "Para investidores iniciantes que buscam oportunidades verificadas.",
      features: [
        "Acesso a rodadas verificadas",
        "Dashboard de investimentos",
        "Relatórios mensais",
        "Suporte por e-mail",
      ],
      isFeatured: false,
    },
    {
      plan: "Profissional",
      price: 499,
      period: "/mês",
      description:
        "Para investidores ativos que querem prioridade e insights avançados.",
      features: [
        "Tudo do Essencial",
        "Prioridade nas rodadas",
        "Alertas em tempo real",
        "Consultoria estratégica",
        "Suporte prioritário",
      ],
      isFeatured: true,
    },
    {
      plan: "Fundador",
      price: 999,
      period: "/mês",
      description:
        "Para founders que precisam captar, acompanhar e escalar a startup.",
      features: [
        "Tudo do Profissional",
        "Gestão completa de captações",
        "Ferramentas de time e KPIs",
        "Suporte dedicado",
        "Onboarding personalizado",
      ],
      isFeatured: false,
    },
  ];

  return (
    <>
      {/* Animação de entrada */}
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out both;
        }
      `}</style>
      <div className="relative font-sans flex flex-col items-center justify-center overflow-x-hidden bg-stone-950 min-h-screen">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <Header />
          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-stretch max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={`${plan.plan}-${index}`} {...plan} />
            ))}
          </main>
        </div>
      </div>
    </>
  );
}
