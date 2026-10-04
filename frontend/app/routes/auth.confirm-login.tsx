import type { Route } from "./+types/auth.confirm-login";
import { LoginAlertActionPage } from "~/components/auth/login-alert-action-page";

export function meta({}: Route.MetaArgs) { return [{ title: "Confirmar login | iSelfToken" }]; }
export default function ConfirmLoginPage() { return <LoginAlertActionPage action="confirm-login" />; }
