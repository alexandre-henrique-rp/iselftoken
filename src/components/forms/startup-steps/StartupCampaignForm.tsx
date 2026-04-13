'use client';

import type { StartupFormData } from '@/types/startup';
import { useEffect, useMemo, useState } from 'react';

interface StartupCampaignFormProps {
  initialData: Partial<StartupFormData>;
  onBack: () => void;
  onSubmit: (data: StartupFormData) => void;
  isSubmitting: boolean;
}

const META_CAPTACAO_LIMITS: Record<string, { min: number; max: number }> = {
  Ideação: { min: 100_000, max: 300_000 },
  MVP: { min: 100_000, max: 300_000 },
  Tração: { min: 100_000, max: 600_000 },
  Crescimento: { min: 100_000, max: 600_000 },
  Escala: { min: 100_000, max: 1_000_000 },
};

const getMetaCaptacaoLimits = (
  estagio: string | undefined,
): { min: number; max: number } => {
  return (
    META_CAPTACAO_LIMITS[estagio || ''] ?? { min: 100_000, max: 1_000_000 }
  );
};

const formatMoney = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function StartupCampaignForm({
  initialData,
  onBack,
  onSubmit,
  isSubmitting,
}: StartupCampaignFormProps) {
  const safeInitialData = initialData as Record<string, unknown>;

  const [localData, setLocalData] = useState({
    meta_captacao: (safeInitialData.meta_captacao as number) || 0,
    equity_oferecido: (safeInitialData.equity_oferecido as number) || 0,
    valuation_calculado: initialData.valuation_calculado || 0,
    // Recursos
    recursos: initialData.recursos || {
      fundados: 0,
      desenvolvimento: 0,
      comercial: 0,
      marketing: 0,
      nuvem: 0,
      juridico: 0,
      reserva: 0,
    },
    // Configs
    part_lucro: initialData.part_lucro || false,
    part_lucro_regras: initialData.part_lucro_regras || '',
    beneficios: initialData.beneficios || false,
    beneficios_regras: initialData.beneficios_regras || '',
    termos: initialData.termos || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const metaCaptacaoLimits = getMetaCaptacaoLimits(initialData.estagio);

  useEffect(() => {
    if (localData.meta_captacao > 0 && localData.equity_oferecido > 0) {
      const valuation =
        (localData.meta_captacao / localData.equity_oferecido) * 100;
      setLocalData((prev) => ({
        ...prev,
        valuation_calculado: Math.round(valuation * 100) / 100,
      }));
    } else {
      setLocalData((prev) => ({ ...prev, valuation_calculado: 0 }));
    }
  }, [localData.meta_captacao, localData.equity_oferecido]);

  // Total Recursos
  const totalRecursos = useMemo(() => {
    if (!localData.recursos) return 0;
    return Object.values(localData.recursos).reduce(
      (a, b) => Number(a) + Number(b),
      0,
    );
  }, [localData.recursos]);

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const numericValue = value === '' ? 0 : Number(value);

    setLocalData((prev) => ({
      ...prev,
      [name]: numericValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleResourceChange = (key: string, value: number) => {
    setLocalData((prev) => ({
      ...prev,
      recursos: {
        ...prev.recursos,
        [key]: value,
      },
    }));
  };

  const handleConfigChange = (field: string, value: boolean | string) => {
    setLocalData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (localData.meta_captacao < metaCaptacaoLimits.min) {
      newErrors.meta_captacao = `Mínimo de ${formatMoney(metaCaptacaoLimits.min)} para este estágio`;
    }
    if (localData.meta_captacao > metaCaptacaoLimits.max) {
      newErrors.meta_captacao = `Máximo de ${formatMoney(metaCaptacaoLimits.max)} para este estágio`;
    }
    if (localData.equity_oferecido <= 0 || localData.equity_oferecido > 100) {
      newErrors.equity_oferecido = 'Equity deve ser entre 0.1% e 100%';
    }

    if (Math.abs(totalRecursos - 100) >= 0.1) {
      newErrors.recursos = 'A soma dos recursos deve ser exatamente 100%';
    }

    if (!localData.termos) {
      newErrors.termos = 'Você deve aceitar os termos legais';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitClick = () => {
    if (validateStep2()) {
      const finalData = {
        ...initialData,
        ...localData,
        campanha: [
          {
            id: 0,
            status: 'Ativa',
            dt_inicio: new Date().toISOString(),
            dt_fim: new Date(
              new Date().setMonth(new Date().getMonth() + 6),
            ).toISOString(),
            meta_captacao: localData.meta_captacao,
            equity_oferecido: localData.equity_oferecido,
          },
        ],
      } as StartupFormData;

      onSubmit(finalData);
    } else {
      // Scroll to first error if needed, or top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderResourceSlider = (
    key: keyof typeof localData.recursos,
    label: string,
  ) => (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-[#d500f9]">
          {localData.recursos[key] || 0}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={localData.recursos[key] || 0}
        onChange={(e) => handleResourceChange(key, Number(e.target.value))}
        className="bg-secondary h-2 w-full cursor-pointer appearance-none rounded-lg accent-[#d500f9]"
      />
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-500">
      {/* Card Premium de Captação */}
      <section className="rounded-smooth border-border bg-card border p-10 shadow-lg">
        <div className="border-border mb-8 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#d500f9]/20 bg-[#d500f9]/10 text-[#d500f9]">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h2 className="text-foreground text-2xl font-light tracking-tight">
                Captação e Valuation
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Defina os valores de investimento para o estágio{' '}
                <span className="font-semibold text-[#d500f9]">
                  {initialData.estagio || 'Indefinido'}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Meta de Captação */}
          <div>
            <label className="text-foreground mb-2 block text-sm font-medium">
              Meta de Captação (R$) <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="number"
              name="meta_captacao"
              value={localData.meta_captacao || ''}
              onChange={handleNumberChange}
              placeholder="500000"
              min={metaCaptacaoLimits.min}
              max={metaCaptacaoLimits.max}
              step={1000}
              className={`bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm transition-all duration-300 focus:outline-none ${
                errors.meta_captacao
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20 focus:ring-2'
                  : 'border-border focus:border-[#d500f9]/30 focus:ring-2 focus:ring-[#d500f9]/10'
              }`}
            />
            {localData.meta_captacao > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                {formatMoney(localData.meta_captacao)}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              Para o estágio selecionado, a meta deve ficar entre{' '}
              {formatMoney(metaCaptacaoLimits.min)} e{' '}
              {formatMoney(metaCaptacaoLimits.max)}.
            </p>
            {errors.meta_captacao && (
              <p className="text-destructive mt-2 flex items-center gap-1.5 text-xs">
                <span>⚠️</span> {errors.meta_captacao}
              </p>
            )}
          </div>

          {/* Equity Oferecido */}
          <div>
            <label className="text-foreground mb-2 block text-sm font-medium">
              Equity Oferecido (%) <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="number"
              name="equity_oferecido"
              value={localData.equity_oferecido || ''}
              onChange={handleNumberChange}
              placeholder="15"
              min={0}
              max={100}
              step={0.1}
              className={`bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm transition-all duration-300 focus:outline-none ${
                errors.equity_oferecido
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20 focus:ring-2'
                  : 'border-border focus:border-[#d500f9]/30 focus:ring-2 focus:ring-[#d500f9]/10'
              }`}
            />
            {errors.equity_oferecido && (
              <p className="text-destructive mt-2 flex items-center gap-1.5 text-xs">
                <span>⚠️</span> {errors.equity_oferecido}
              </p>
            )}
          </div>

          {/* Valuation Calculado - Card Premium */}
          <div className="mt-4 md:col-span-2">
            <div className="relative overflow-hidden rounded-xl border border-[#d500f9]/30 bg-linear-to-br from-[#d500f9]/10 to-[#d500f9]/5 p-8">
              {/* Decoration */}
              <div className="pointer-events-none absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-[#d500f9] opacity-10 blur-2xl"></div>

              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                    Valuation Calculado (Pre-Money)
                  </p>
                  <p
                    className="text-foreground font-light tracking-tight"
                    style={{ fontSize: '2.5rem', lineHeight: '1' }}
                  >
                    {localData.valuation_calculado > 0
                      ? formatMoney(localData.valuation_calculado)
                      : 'R$ 0,00'}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d500f9]/10 bg-[#d500f9]/20 text-[#d500f9]">
                  <span className="text-3xl">📊</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-xs">
                O Valuation é calculado automaticamente dividindo a Meta de
                Captação pelo Equity Oferecido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: Destinação dos Recursos */}
      <section className="rounded-smooth border-border bg-card border p-10 shadow-lg">
        <div className="border-border mb-8 border-b pb-6">
          <h2 className="text-foreground text-xl font-light tracking-tight">
            Destinação dos Recursos
          </h2>
          <p className="text-muted-foreground text-sm">
            Como o investimento será utilizado (deve somar 100%)
          </p>
        </div>
        <div className="space-y-4">
          {renderResourceSlider('fundados', 'Fundadores')}
          {renderResourceSlider('desenvolvimento', 'Desenvolvimento')}
          {renderResourceSlider('comercial', 'Comercial')}
          {renderResourceSlider('marketing', 'Marketing')}
          {renderResourceSlider('juridico', 'Jurídico')}
          {renderResourceSlider('reserva', 'Reserva')}

          <div
            className={`mt-6 flex items-center justify-between rounded-lg border px-4 py-3 ${Math.abs(totalRecursos - 100) < 0.1 ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-red-500 bg-red-500/10 text-red-500'}`}
          >
            <span className="font-medium">Total Alocado</span>
            <span className="text-xl font-bold">
              {totalRecursos.toFixed(0)}%
            </span>
          </div>
          {errors.recursos && (
            <p className="text-destructive mt-1 text-right text-xs">
              {errors.recursos}
            </p>
          )}
        </div>
      </section>

      {/* SEÇÃO: Regras de Negócio */}
      <section className="rounded-smooth border-border bg-card border p-10 shadow-lg">
        <div className="border-border mb-8 border-b pb-6">
          <h2 className="text-foreground text-xl font-light tracking-tight">
            Regras & Termos
          </h2>
        </div>
        <div className="space-y-4">
          {/* Participação nos Lucros */}
          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${localData.part_lucro ? 'border-[#d500f9] bg-[#d500f9]/5' : 'border-border hover:bg-secondary/50'}`}
            >
              <input
                type="checkbox"
                checked={localData.part_lucro}
                onChange={(e) =>
                  handleConfigChange('part_lucro', e.target.checked)
                }
                className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
              />
              <span className="text-foreground text-sm font-medium">
                Participação nos Lucros
              </span>
            </label>

            {localData.part_lucro && (
              <div className="animate-in slide-in-from-top-2 fade-in ml-2 border-l-2 border-[#d500f9]/30 pl-4 duration-300">
                <label className="text-muted-foreground mb-2 block text-xs font-medium">
                  Regras de Distribuição
                </label>
                <textarea
                  value={localData.part_lucro_regras}
                  onChange={(e) =>
                    handleConfigChange('part_lucro_regras', e.target.value)
                  }
                  placeholder="Descreva como será feita a distribuição dos lucros..."
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground min-h-[100px] w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm transition-all focus:border-[#d500f9] focus:ring-1 focus:ring-[#d500f9] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Benefícios Extras */}
          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${localData.beneficios ? 'border-[#d500f9] bg-[#d500f9]/5' : 'border-border hover:bg-secondary/50'}`}
            >
              <input
                type="checkbox"
                checked={localData.beneficios}
                onChange={(e) =>
                  handleConfigChange('beneficios', e.target.checked)
                }
                className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
              />
              <span className="text-foreground text-sm font-medium">
                Benefícios Extras
              </span>
            </label>

            {localData.beneficios && (
              <div className="animate-in slide-in-from-top-2 fade-in ml-2 border-l-2 border-[#d500f9]/30 pl-4 duration-300">
                <label className="text-muted-foreground mb-2 block text-xs font-medium">
                  Detalhamento dos Benefícios
                </label>
                <textarea
                  value={localData.beneficios_regras}
                  onChange={(e) =>
                    handleConfigChange('beneficios_regras', e.target.value)
                  }
                  placeholder="Liste os benefícios..."
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground min-h-[100px] w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm transition-all focus:border-[#d500f9] focus:ring-1 focus:ring-[#d500f9] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Termos Legais */}
          <div>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${errors.termos ? 'border-destructive' : 'border-border hover:bg-secondary/50'}`}
            >
              <input
                type="checkbox"
                checked={localData.termos}
                onChange={(e) => handleConfigChange('termos', e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
              />
              <span className="text-foreground text-sm font-medium">
                Declaro que li e aceito os termos de serviço e responsabilidade
                legal.
              </span>
            </label>
            {errors.termos && (
              <p className="text-destructive mt-1 ml-2 text-xs">
                {errors.termos}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors"
        >
          ⬅ Voltar para Dados
        </button>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => console.log('Salvar Rascunho')}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:block"
          >
            Salvar Rascunho
          </button>

          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#d500f9] px-8 py-3 font-bold tracking-wider text-white uppercase shadow-[0_6px_18px_rgba(213,0,249,0.35)] transition-all duration-300 hover:scale-[1.01] hover:bg-linear-to-r hover:from-[#d500f9] hover:to-[#e400e5] hover:shadow-[0_10px_28px_rgba(213,0,249,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Processando...
              </>
            ) : (
              <>
                <span>🚀</span>
                Lançar Campanha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
