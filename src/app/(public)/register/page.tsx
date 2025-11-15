import RegisterForm from '@/components/auth/RegisterForm';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';

export default function RegisterPage() {
 
  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-05.jpg"
      showLoginLink={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Criar conta
          </h2>
        </div>
        
        <RegisterForm />
      </div>
    </AuthLayoutPremium>
  );
}