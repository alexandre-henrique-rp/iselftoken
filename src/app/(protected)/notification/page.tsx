// Força renderização dinâmica para permitir uso de cookies na autenticação
export const dynamic = 'force-dynamic';

import { NotificationClient, NotificationData } from '@/components/NotificationClient';

// Dados de exemplo para apresentação
const sampleNotifications: NotificationData[] = [
  {
    id: '1',
    subject: 'Bem-vindo à plataforma iSelfToken!',
    sentDate: '2025-08-25 10:30:45',
    content: 'Olá! Estamos felizes em tê-lo(a) na plataforma iSelfToken. Explore as oportunidades de investimento e conecte-se com startups inovadoras. Se precisar de ajuda, nossa equipe de suporte está à disposição.',
    isRead: false
  },
  {
    id: '2',
    subject: 'Nova oportunidade de investimento',
    sentDate: '2025-08-24 15:22:10',
    content: 'Uma nova startup, EcoTech Solutions, está agora disponível para investimento. Eles estão focados em soluções de energia renovável. Confira os detalhes e considere investir!',
    isRead: true
  },
  {
    id: '3',
    subject: 'Atualização de perfil necessária',
    sentDate: '2025-08-23 09:10:33',
    content: 'Por favor, atualize as informações do seu perfil para continuar utilizando todas as funcionalidades da plataforma. Clique em "Meu Perfil" para completar as informações pendentes.',
    isRead: false
  },
  {
    id: '4',
    subject: 'Confirmação de investimento',
    sentDate: '2025-08-22 11:45:07',
    content: 'Parabéns! Seu investimento na startup TechFuture foi confirmado. Valor investido: R$ 5.000,00. Você receberá atualizações regulares sobre o progresso da startup.',
    isRead: true
  },
  {
    id: '5',
    subject: 'Evento exclusivo para investidores',
    sentDate: '2025-08-21 14:18:29',
    content: 'Convidamos você para um evento exclusivo online com as principais startups da plataforma. Data: 30/08/2025 às 19h. Inscreva-se agora para garantir sua vaga!',
    isRead: false
  },
  {
    id: '6',
    subject: 'Lembrete: Complete sua verificação de identidade',
    sentDate: '2025-08-20 16:05:52',
    content: 'Para garantir a segurança da sua conta, pedimos que complete a verificação de identidade enviando os documentos necessários. Acesse "Configurações" para fazer o upload.',
    isRead: true
  }
];

export default function NotificationPage() {
  // Em um cenário real, aqui você buscaria as notificações do usuário
  // const notifications = await getNotificationsForUser(userId);
  
  return <NotificationClient initialNotifications={sampleNotifications} />;
}