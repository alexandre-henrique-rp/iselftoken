import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

// Carrega recursos de tradução
import ptBRHome from '../i18n/locales/pt-BR/home.json';
import ptBRLogin from '../i18n/locales/pt-BR/login.json';
import ptBRRegister from '../i18n/locales/pt-BR/register.json';
import ptBRRecoverPassword from '../i18n/locales/pt-BR/recover-password.json';
import ptBRResetPassword from '../i18n/locales/pt-BR/reset-password.json';

import ptPTHome from '../i18n/locales/pt-PT/home.json';
import ptPTLogin from '../i18n/locales/pt-PT/login.json';
import ptPTRegister from '../i18n/locales/pt-PT/register.json';
import ptPTRecoverPassword from '../i18n/locales/pt-PT/recover-password.json';
import ptPTResetPassword from '../i18n/locales/pt-PT/reset-password.json';

import enUSHome from '../i18n/locales/en-US/home.json';
import enUSLogin from '../i18n/locales/en-US/login.json';
import enUSRegister from '../i18n/locales/en-US/register.json';
import enUSRecoverPassword from '../i18n/locales/en-US/recover-password.json';
import enUSResetPassword from '../i18n/locales/en-US/reset-password.json';

import enUKHome from '../i18n/locales/en-UK/home.json';
import enUKLogin from '../i18n/locales/en-UK/login.json';
import enUKRegister from '../i18n/locales/en-UK/register.json';
import enUKRecoverPassword from '../i18n/locales/en-UK/recover-password.json';
import enUKResetPassword from '../i18n/locales/en-UK/reset-password.json';

import esESHome from '../i18n/locales/es-ES/home.json';
import esESLogin from '../i18n/locales/es-ES/login.json';
import esESRegister from '../i18n/locales/es-ES/register.json';
import esESRecoverPassword from '../i18n/locales/es-ES/recover-password.json';
import esESResetPassword from '../i18n/locales/es-ES/reset-password.json';

const resources: Resource = {
  'pt-BR': {
    home: ptBRHome,
    login: ptBRLogin,
    register: ptBRRegister,
    recoverPassword: ptBRRecoverPassword,
    resetPassword: ptBRResetPassword
  },
  'pt-PT': {
    home: ptPTHome,
    login: ptPTLogin,
    register: ptPTRegister,
    recoverPassword: ptPTRecoverPassword,
    resetPassword: ptPTResetPassword
  },
  'en-US': {
    home: enUSHome,
    login: enUSLogin,
    register: enUSRegister,
    recoverPassword: enUSRecoverPassword,
    resetPassword: enUSResetPassword
  },
  'en-UK': {
    home: enUKHome,
    login: enUKLogin,
    register: enUKRegister,
    recoverPassword: enUKRecoverPassword,
    resetPassword: enUKResetPassword
  },
  'es-ES': {
    home: esESHome,
    login: esESLogin,
    register: esESRegister,
    recoverPassword: esESRecoverPassword,
    resetPassword: esESResetPassword
  },
};

function isSupportedLocale(lng: string | null): lng is string {
	return (
		lng === "pt-BR" ||
		lng === "pt-PT" ||
		lng === "en-US" ||
		lng === "en-UK" ||
		lng === "es-ES"
	);
}

if (!i18n.isInitialized) {
	i18n
		.use(initReactI18next)
		.init({
			resources,
			lng: getInitialLng(),
			fallbackLng: "pt-BR",
			debug: false,
			ns: ["home", "login", "register", "recoverPassword", "resetPassword"],
			defaultNS: "home",
			interpolation: {
				escapeValue: false,
			},
			returnNull: false,
			returnEmptyString: false,
			react: {
				useSuspense: false,
			},
		})
		.then(() => {})
		.catch(() => {
			// Silencia erro de init
		});
}

export async function setLanguage(lng: string) {
	const fallback = isSupportedLocale(lng) ? lng : "pt-BR";
	i18n.changeLanguage(fallback);
}

export default i18n;

function getInitialLng(): string {
	if (typeof window === 'undefined') {
		return 'pt-BR';
	}
	const url = new URL(window.location.href);
	const lng = url.searchParams.get('lng');
	if (isSupportedLocale(lng)) {
		return lng;
	}
	const browserLng = navigator.language;
	if (isSupportedLocale(browserLng)) {
		return browserLng;
	}
	return 'pt-BR';
}
