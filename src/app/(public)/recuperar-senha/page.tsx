import RecoverPasswordForm from '@/components/auth/RecoverPasswordForm';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';

/**
 * Página de recuperação de senha
 * Permite ao usuário solicitar um link para redefinir sua senha
 */
export default function RecoverPasswordPage() {
  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-03.jpg"
      showLoginLink={false}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-light text-white">
            Recuperar senha
          </h2>
        </div>

        <RecoverPasswordForm />
      </div>
    </AuthLayoutPremium>
  );
}
