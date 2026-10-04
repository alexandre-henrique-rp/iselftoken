import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ShieldCheck, Coins, Loader2, ShieldAlert } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "~/hooks/use-user";
import { Drawer, DrawerBody, DrawerFooter } from "~/components/ui/drawer";
import { InitialsImage } from "~/components/ui/initials-image";

interface InvestmentInfo {
  campaignId: number;
  tokenPrice: number;
  tokensAvailable: number;
  /** Preço base por token (repasse à startup). Null em campanhas legadas. */
  tokenBasePrice?: number | null;
  /**
   * Alíquota da taxa da plataforma vigente na campanha (ex.: 0.05 = 5%),
   * cobrada POR CIMA do subtotal de tokens no checkout. Null em campanhas
   * legadas — nesse caso o breakdown omite a linha da taxa.
   */
  platformFeePct?: number | null;
}

interface InvestmentSidebarProps {
  raised: string;
  goal: string;
  valuation: string;
  percentage: number;
  remainingDays: number;
  equity: string;
  startupName: string;
  startupLogo: string;
  startupDescription: string;
  investment: InvestmentInfo | null;
  affiliateCode: string | null;
  /**
   * Quando `true`, o CTA "Investir" fica desabilitado com tooltip explicando
   * que a página é um preview. Usado na rota `/startup/:slug/preview`.
   */
  preview?: boolean;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function InvestmentSidebar({
  raised,
  goal,
  valuation,
  percentage,
  remainingDays,
  equity,
  startupName,
  startupLogo,
  startupDescription,
  investment,
  affiliateCode,
  preview = false,
}: InvestmentSidebarProps) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  // KYC: só investe quem tem o documento de identidade APROVADO. Enquanto o
  // usuário não carregou, não bloqueia (o backend continua sendo a autoridade).
  const kycStatus = user?.documento?.status ?? null;
  const kycAprovado = kycStatus === "APPROVED";
  const bloqueadoPorKyc = !kycAprovado;
  const rodadaAberta = investment !== null && investment.tokensAvailable > 0;
  // Em preview, sempre bloqueia (founder não pode investir na própria página).
  const bloqueadoPorPreview = preview;
  return (
    <aside className="lg:w-96 shrink-0">
      <div className="sticky top-28 space-y-6">
        <div className="glass-card relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-background p-8 shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="w-20 h-20 text-primary rotate-12" />
          </div>

          <div className="relative z-10 space-y-8">
            <div className="space-y-5">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arrecadado</span>
                <div className="whitespace-nowrap text-[clamp(2rem,8vw,2.25rem)] font-black leading-none text-primary drop-shadow-[0_0_15px_rgba(213,0,249,0.3)]">{raised}</div>
              </div>
              <div className="text-right">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta</span>
                <div className="whitespace-nowrap text-xl font-bold text-foreground/60">{goal}</div>
              </div>
              <div className="text-right">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valuation</span>
                <div className="whitespace-nowrap text-xl font-bold text-foreground">{valuation}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full kinetic-gradient shadow-[0_0_20px_rgba(213,0,249,0.5)] transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60 text-foreground">
                <span>{percentage}% Concluído</span>
                <span>{remainingDays} dias restantes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 py-6 border-y border-white/5">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Equity Oferecido</span>
                <div className="text-2xl font-black text-foreground">{equity}</div>
              </div>
            </div>

            {kycAprovado && rodadaAberta && !bloqueadoPorPreview ? (
              <button
                onClick={() => setOpen(true)}
                className="w-full kinetic-gradient text-black py-5 rounded-2xl font-black text-lg tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_12px_24px_rgba(213,0,249,0.3)]"
              >
                Investir Agora
              </button>
            ) : null}

            {bloqueadoPorPreview ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-primary/90 leading-relaxed">
                  <span className="font-black text-primary">
                    Modo preview ativo.
                  </span>{" "}
                  Ações de investimento ficam desabilitadas nesta página.
                </p>
              </div>
            ) : bloqueadoPorKyc ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  <span className="font-black text-amber-300">
                    {kycStatus === "REJECTED" ? "Documento reprovado." : "Verificação de identidade pendente."}
                  </span>{" "}
                  Para investir você precisa concluir seu KYC.{" "}
                  <Link to="/profile" className="text-amber-300 font-bold underline underline-offset-2">
                    {kycStatus === "REJECTED" ? "Reenviar documento" : "Concluir agora"}
                  </Link>
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-center text-muted-foreground leading-relaxed font-medium px-4">
                Ao clicar, você concorda com os termos de investimento e declara ciência dos riscos de capital.
              </p>
            )}
          </div>
        </div>

        {/* Secondary Card (Trust) */}
        <div className="p-6 bg-accent/20 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">Oferta Auditada</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
            Esta startup passou pelo processo de Due Diligence técnica e financeira da iSelfToken. Todos os dados apresentados são validados mensalmente.
          </p>
        </div>
      </div>

      {open && investment && (
        <InvestModal
          startupName={startupName}
          startupLogo={startupLogo}
          startupDescription={startupDescription}
          investment={investment}
          affiliateCode={affiliateCode}
          onClose={() => setOpen(false)}
        />
      )}
    </aside>
  );
}

function InvestModal({
  startupName,
  startupLogo,
  startupDescription,
  investment,
  affiliateCode,
  onClose,
}: {
  startupName: string;
  startupLogo: string;
  startupDescription: string;
  investment: InvestmentInfo;
  affiliateCode: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { campaignId, tokenPrice, tokensAvailable, platformFeePct } = investment;
  const [tokensQty, setTokensQty] = useState<number>(1);
  // Código do afiliado: pré-preenchido pelo ?ref= do link, mas editável para
  // quem não chegou pelo link e quer digitar um código manualmente.
  const [code, setCode] = useState<string>(affiliateCode ?? "");
  const codeTrim = code.trim();
  const veioDoLink = !!affiliateCode && codeTrim === affiliateCode.trim();
  const codeInvalido = codeTrim.length > 0 && (codeTrim.length < 3 || codeTrim.length > 32);

  const investMutation = useMutation({
    mutationFn: async ({ amount, affiliateCode }: { amount: number; affiliateCode?: string }) => {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId, amount, ...(affiliateCode ? { affiliateCode } : {}) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        throw new Error(json?.message ?? "Não foi possível criar o investimento.");
      }
      return json;
    },
    onSuccess: (json) => {
      const paymentId = json?.data?.payment?.id;
      if (!paymentId) {
        toast.error("Investimento criado, mas não foi possível abrir o pagamento.");
        return;
      }
      toast.success("Reserva feita! Redirecionando ao pagamento…");
      navigate(`/checkout/payment/${paymentId}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro de conexão.");
    },
  });

  const enviando = investMutation.isPending;

  // Breakdown Modelo B: o investidor paga subtotal de tokens + taxa da
  // plataforma. O valor enviado ao backend continua sendo o SUBTOTAL —
  // a taxa é calculada e cobrada no checkout/confirmation pelo backend.
  const subtotalTokens = tokensQty * tokenPrice;
  const feePct = platformFeePct ?? 0;
  const feeAmount = subtotalTokens * feePct;
  const totalAmount = subtotalTokens + feeAmount;
  const erro = useMemo(() => {
    if (tokensQty < 1) return "Selecione ao menos 1 token.";
    if (tokensQty > tokensAvailable) {
      return `Restam apenas ${tokensAvailable.toLocaleString("pt-BR")} tokens.`;
    }
    return null;
  }, [tokensQty, tokensAvailable]);

  async function submeter() {
    if (erro || codeInvalido) return;
    investMutation.mutate({
      // O backend deriva tokensQty = trunc(amount / precoVenda) e calcula a
      // taxa da plataforma por cima — enviamos o SUBTOTAL de tokens.
      amount: subtotalTokens,
      affiliateCode: codeTrim.length >= 3 ? codeTrim : undefined,
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow="Investimento"
      title="Comprar tokens"
      placement="bottom"
      className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background"
    >
      <DrawerBody className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-background/40 p-4">
          <InitialsImage
            name={startupName}
            src={startupLogo}
            alt={startupName}
            className="h-14 w-14 shrink-0 rounded-xl"
            fallbackClassName="bg-primary/10"
            fallbackTextClassName="text-lg font-black text-primary"
          />
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight text-foreground">
              {startupName}
            </h3>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {startupDescription}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Quantidade de tokens
          </label>
          <input
            type="number"
            min={1}
            max={tokensAvailable}
            step={1}
            value={Number.isFinite(tokensQty) ? tokensQty : ""}
            onChange={(e) => setTokensQty(Number(e.target.value))}
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-black text-foreground outline-none focus:border-primary/50"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Preço de venda: {brl(tokenPrice)} por token</span>
            <span>Disponível: {tokensAvailable.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        {/* Breakdown: subtotal de tokens + taxa da plataforma + total */}
        <div className="rounded-2xl bg-accent/30 border border-white/5 px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Coins className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Você recebe</p>
              <p className="text-sm font-black text-foreground">
                {tokensQty.toLocaleString("pt-BR")} tokens
              </p>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {tokensQty.toLocaleString("pt-BR")} × {brl(tokenPrice)}
              </span>
              <span className="font-bold text-foreground">
                {brl(subtotalTokens)}
              </span>
            </div>
            {platformFeePct != null && feePct > 0 ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Taxa da plataforma (
                  {(feePct * 100).toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}
                  %)
                </span>
                <span className="font-bold text-foreground">
                  {brl(feeAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-white/5 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                Total a pagar
              </span>
              <span className="text-xl font-black tracking-tighter text-primary">
                {brl(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Código de afiliado (opcional) */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Código de afiliado <span className="text-muted-foreground/50">(opcional)</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AFL-XXXXXXXX"
            maxLength={32}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground font-mono text-sm tracking-wider outline-none focus:border-primary/50 placeholder:text-muted-foreground/30"
          />
          {codeInvalido ? (
            <p className="text-[10px] text-red-400 mt-1.5">O código deve ter entre 3 e 32 caracteres.</p>
          ) : veioDoLink ? (
            <p className="text-[10px] text-primary mt-1.5">Aplicado automaticamente pelo link de indicação.</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">Tem o código de quem te indicou? Informe para creditar a indicação.</p>
          )}
        </div>

        {erro && <p className="text-xs text-red-400 font-medium">{erro}</p>}

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground/70">
          Os tokens ficam reservados por 24h enquanto você conclui o pagamento.
        </p>
      </DrawerBody>
      <DrawerFooter className="grid grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submeter}
          disabled={!!erro || codeInvalido || enviando}
          className="kinetic-gradient rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Comprando…
            </span>
          ) : (
            "Comprar tokens"
          )}
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
