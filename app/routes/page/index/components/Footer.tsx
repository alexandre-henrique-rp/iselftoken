/**
 * @name Footer
 * @description Renderiza o footer institucional da homepage.
 *
 * @returns {JSX.Element} Rodape com links e informacoes de contato.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-xl font-bold text-primary">iSelfToken</h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Conectamos investidores e fundadores em uma plataforma segura e
              acessivel, democratizando o acesso ao venture capital.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Plataforma
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a className="transition-colors hover:text-foreground" href="#">
                  Para Investidores
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-foreground" href="#">
                  Para Projetos
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-foreground" href="#">
                  iSelfToken Education
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a className="transition-colors hover:text-foreground" href="#">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-foreground" href="#">
                  Privacidade
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Contato</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  className="transition-colors hover:text-foreground"
                  href="mailto:contato@iselftoken.com"
                >
                  contato@iselftoken.com
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-foreground"
                  href="tel:+551199999999"
                >
                  +55 11 9999-9999
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © 2026 iSelfToken. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
