import { LoginAlertActionPage } from "~/components/auth/login-alert-action-page";
import type { Route } from "./+types/auth.dismiss-session";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Segurança da conta | iSelfToken" }];
}
export default function DismissSessionPage() {
  return <LoginAlertActionPage action="dismiss-session" />;
}
