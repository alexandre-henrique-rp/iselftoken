import { ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { useState, type JSX } from "react";
import { redirect, useNavigate } from "react-router";
import { toast } from "sonner";
import LayoutPublic from "~/components/layout_public";
import { Button } from "~/components/ui/button";
import { af2CodeGenerator } from "~/constants";
import { decryptPayload } from "~/lib/special-functions/encrypt-payload";
import type { PayloadAf2Type } from "~/types/payloadAf2";
import type { Route } from "./+types";
import { Af2Footer } from "./components/Af2Footer";
import { Af2Header } from "./components/Af2Header";
import { CountdownTimer } from "./components/CountdownTimer";
import { OtpInput } from "./components/OtpInput";

const OTP_LENGTH = 6;

/**
 * @name loader
 * @description Carrega e valida o payload criptografado da rota AF2.
 *
 * @param {Route.LoaderArgs} args - Dados da rota com params.
 * @returns {Promise<PayloadAf2Type | Response>} Dados para renderização ou erro.
 */
export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<PayloadAf2Type | Response> {
  const referer = request.headers.get("Referer") || "/login";
  const token = params.token;

  if (!token) {
    return redirect(referer);
  }

  const data = await decryptPayload<PayloadAf2Type>(token);

  if (!data?.codigo || !data?.path) {
    return redirect(referer);
  }

  if (data.expiresAt < new Date()) {
    if (data.email) {
      try {
        const codigoGerado = af2CodeGenerator();

        const api = await fetch("/api/auth/new-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigo: codigoGerado,
            path: data.path,
            email: data.email,
            urlRedirect: window.location.origin,
          }),
        });

        const dataApi = await api.json();

        if (!api.ok || dataApi?.error) {
          throw new Error(dataApi?.message || "Erro ao reenviar código.");
        }

        return {
          codigo: codigoGerado,
          path: data.path,
          expiresAt: data.expiresAt,
          email: data.email,
          createdAt: data.createdAt,
        };
      } catch {
        return redirect(referer);
      }
    }
    return redirect(referer);
  }

  return data;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * @name AF2Page
 * @description Tela de verificação em dois fatores com OTP.
 *
 * @param {Route.ComponentProps} props - Dados da rota.
 * @returns {JSX.Element} Layout completo da tela AF2.
 */
export default function AF2Page({
  loaderData,
}: Route.ComponentProps): JSX.Element {
  const data = loaderData;

  const [codigo, setCodigo] = useState(data.codigo);
  const path = data.path || "/home";
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const isVerifyDisabled = otp.length !== OTP_LENGTH || loading;

  /**
   * @name handleTimerComplete
   * @description Habilita o reenvio quando o tempo expira.
   */
  const handleTimerComplete = () => {
    setCanResend(true);
  };

  /**
   * @name handleResend
   * @description Reenvia o código usando o mesmo fluxo do loader.
   */
  const handleResend = async () => {
    if (loading) return;

    if (!data.email) {
      toast.error("Não foi possível reenviar o código.", {
        duration: 5000,
      });
      setErrorMessage("Não foi possível reenviar o código.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    const codigoGerado = af2CodeGenerator();

    try {
      const api = await fetch("/api/auth/new-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo: codigoGerado,
          path: data.path,
          email: data.email,
          urlRedirect: window.location.origin,
        }),
      });

      const dataApi = await api.json();

      if (!api.ok || dataApi?.error) {
        toast.error(dataApi?.message || "Erro ao reenviar código.", {
          duration: 5000,
          description: dataApi?.detalhe?.message || "",
        });
        return;
      }

      setCodigo(codigoGerado);
      setOtp("");
      setCanResend(false);
      setResetKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @name handleVerify
   * @description Valida o OTP informado e redireciona em caso de sucesso.
   */
  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH || loading) return;

    setLoading(true);
    setErrorMessage("");

    if (otp !== codigo) {
      setErrorMessage("Código inválido. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      const api = await fetch("/api/auth/verify-af2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!api.ok) {
        setErrorMessage("Erro ao verificar código. Tente novamente.");
        setLoading(false);
        return;
      }

      navigate(path);
    } catch {
      setErrorMessage("Erro ao verificar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutPublic>
      {/* ==================== COLUNA ESQUERDA (VERIFICAÇÃO) ==================== */}
      <div className="flex flex-col p-8 md:p-12 relative z-10">
        {/* Header Mobile / Logo */}
        <Af2Header />

        {/* Container Centralizado */}
        <div className="mx-auto w-full max-w-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-50 mb-3 tracking-tight">
              Verificação em dois fatores
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Para sua segurança, enviamos um código de 6 dígitos para o seu
              e-mail.
            </p>
          </div>

          <div className="space-y-8">
            {/* Input OTP */}
            <div>
              <OtpInput
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerify}
              />
              <div className="text-center mt-4 space-y-2">
                <CountdownTimer
                  startInSeconds={300}
                  resetKey={resetKey}
                  onComplete={handleTimerComplete}
                />
                {errorMessage && (
                  <p className="text-red-500 text-sm font-medium animate-pulse">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <Button
                onClick={handleVerify}
                disabled={isVerifyDisabled}
                className="h-12 w-full gap-2 rounded-lg border border-transparent bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500 disabled:shadow-none"
              >
                {loading ? "Verificando..." : "Verificar código"}
              </Button>

              <Button
                onClick={handleResend}
                disabled={!canResend || loading}
                className="h-12 w-full gap-2 rounded-lg border border-stone-700 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-all duration-200 hover:border-stone-600 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw
                  className={`w-4 h-4 ${!canResend && "opacity-50"}`}
                />
                {loading ? "Aguarde..." : "Reenviar código"}
              </Button>
            </div>

            <div className="pt-4 border-t border-stone-800">
              <button
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 transition-colors text-sm font-medium p-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para login
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Af2Footer />
      </div>
    </LayoutPublic>
  );
}
