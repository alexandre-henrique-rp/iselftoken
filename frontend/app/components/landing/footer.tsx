import { Link } from "react-router";
import { Share2, ExternalLink } from "lucide-react";

const platformLinks = [
  { label: "Explorar Rodadas", href: "#" },
  { label: "Mercado Secundário", href: "#" },
  { label: "Para Empresas", href: "#" },
  { label: "Metodologia Scoring", href: "#" },
];

// LGPD Art. 9 + Art. 41: política de privacidade e contato do encarregado
// devem ser publicamente acessíveis a partir de qualquer página.
const supportLinks = [
  { label: "Central de Ajuda", href: "#" },
  { label: "Termos de Uso", href: "/termos-de-uso" },
  { label: "Política de Privacidade", href: "/politica-privacidade" },
  { label: "Encarregado de Dados (DPO)", href: "mailto:dpo@iselftoken.com.br" },
  { label: "Compliance", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-background pt-14 pb-8 px-6 md:px-12 lg:px-16 border-t border-primary/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <img
              src="/logo.png"
              alt="iSelfToken"
              className="h-7 w-auto mb-6 block"
              width={1291}
              height={305}
            />
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              <span className="block font-bold text-base text-foreground">
                Capital para quem constrói. Oportunidades para quem investe.
              </span>
              A iSelfToken conecta startups e investidores por meio de uma nova
              experiência de equity crowdfunding.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-card flex items-center justify-center hover:text-primary transition-colors border border-white/5"
              >
                <Share2 className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-card flex items-center justify-center hover:text-primary transition-colors border border-white/5"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h6 className="font-bold mb-6 uppercase tracking-widest text-[10px] text-primary">
              Plataforma
            </h6>
            <ul className="space-y-3 text-xs lg:text-sm text-muted-foreground">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h6 className="font-bold mb-6 uppercase tracking-widest text-[10px] text-primary">
              Suporte
            </h6>
            <ul className="space-y-3 text-xs lg:text-sm text-muted-foreground">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-border/10 text-[10px] lg:text-xs text-muted-foreground gap-4">
          <p>© 2026 iSelfToken Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>Investimento em startups envolve riscos.</span>
            <span>CVM 88</span>
            <a
              href="mailto:dpo@iselftoken.com.br"
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Encarregado de Dados (DPO)
            </a>
            <Link
              to="/politica-privacidade"
              className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
