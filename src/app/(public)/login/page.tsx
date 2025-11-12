/**
 * Página de Login Premium - Layout split-screen moderno
 * Segue padrões de design minimalista e sofisticado
 */

import LoginForm from '@/components/auth/LoginForm';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';

export default function LoginPage() {
  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-05.jpg"
      showLoginLink={false}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Bem-vindo de volta
          </h2>
        </div>
        
        <LoginForm />
      </div>
    </AuthLayoutPremium>
  );
}