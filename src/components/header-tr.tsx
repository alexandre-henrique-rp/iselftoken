"use client";

import { useTranslation } from 'react-i18next';
import '@/i18n';

/**
 * HeaderTr
 * Componente client que exibe um título traduzido do namespace 'common'.
 * Útil para demonstrar o i18n funcionando dentro de uma página server.
 */
export function HeaderTr() {
  const { t } = useTranslation('common');
  return (
    <h1 className="text-3xl font-bold tracking-tight text-white">
      {t('welcome')}
    </h1>
  );
}
