import { Link } from "react-router";
import { Moon } from "lucide-react";
import { useAuthStatus } from "~/hooks/use-auth-status";

export function Navbar() {
  const { isAuthenticated, isAuthorized } = useAuthStatus();

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-12 lg:px-16 h-18 bg-black/70 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="iSelfToken"
          className="h-6 w-auto"
          width={1291}
          height={305}
        />
      </Link>
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-muted-foreground">
          <button className="hover:text-primary transition-colors">PT</button>
          <span className="opacity-30">|</span>
          <button className="hover:text-primary transition-colors">EN</button>
        </div>
        <Moon className="w-4 h-4 text-muted-foreground cursor-pointer" />
        <div className="flex items-center gap-2">
          {isAuthenticated && isAuthorized ? (
            <Link
              to="/home"
              className="px-5 py-1.5 bg-primary text-white hover:bg-primary/80 transition-all rounded-lg font-bold text-xs uppercase"
            >
              Painel
            </Link>
          ) : isAuthenticated && !isAuthorized ? (
            <Link
              to="/2fa"
              className="px-5 py-1.5 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-all rounded-lg font-bold text-xs uppercase"
            >
              Verificar 2FA
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-5 py-1.5 border border-primary/40 text-primary hover:bg-primary hover:text-white transition-all rounded-lg font-bold text-xs uppercase"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
