"use client";
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Carrega recursos de tradução
import ptCommon from '@/../i18n/locales/pt/common.json';
import enCommon from '@/../i18n/locales/en/common.json';
import esCommon from '@/../i18n/locales/es/common.json';

import ptAuth from '@/../i18n/locales/pt/auth.json';
import enAuth from '@/../i18n/locales/en/auth.json';
import esAuth from '@/../i18n/locales/es/auth.json';

import ptDashboard from '@/../i18n/locales/pt/dashboard.json';
import enDashboard from '@/../i18n/locales/en/dashboard.json';
import esDashboard from '@/../i18n/locales/es/dashboard.json';

const resources = {
  pt: { 
    common: ptCommon,
    auth: ptAuth,
    dashboard: ptDashboard
  },
  en: { 
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard
  },
  es: { 
    common: esCommon,
    auth: esAuth,
    dashboard: esDashboard
  },
} as const;

// Inicializa i18next somente uma vez
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'pt',
      fallbackLng: 'pt',
      debug: process.env.NODE_ENV !== 'production',
      ns: ['common', 'auth', 'dashboard'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false, // React já faz escaping
      },
      // Evita warnings no SSR
      returnNull: false,
      returnEmptyString: false,
    })
    .catch(() => {
      // Silencia erro de init em ambiente de build/SSR
    });
}

export function setLanguage(lng: 'pt' | 'en' | 'es') {
  i18n.changeLanguage(lng);
}

export default i18n;

// import { createSharedPathnamesNavigation } from 'next-intl/navigation';

// export const locales = ['pt', 'en', 'es'] as const;
// export const localePrefix = 'always';

// export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({ locales, localePrefix });
