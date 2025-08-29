"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/ui/custom-modal";

// Tipo para dados de notificação
export type NotificationData = {
  id: string;
  subject: string;
  sentDate: string;
  content: string;
  isRead: boolean;
};

// Tipo para filtros
export type FilterType = 'all' | 'read' | 'unread';

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
  const [notifications, setNotifications] = useState<NotificationData[]>(sampleNotifications);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const handleView = (notification: NotificationData) => {
    // Marcar como lida ao visualizar
    if (!notification.isRead) {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n)
    );
  };

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'read' && notification.isRead) ||
                         (filterType === 'unread' && !notification.isRead);
    
    return matchesSearch && matchesFilter;
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-10 px-4 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#014f86] dark:text-blue-400 mb-6 sm:mb-8">Notificações</h1>
      
      {/* Filtros */}
      <div className="mb-6 space-y-4">
        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar notificações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#014f86] dark:focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Filtros por status */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-[#014f86] dark:bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'unread'
                ? 'bg-[#014f86] dark:bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Não lidas ({notifications.filter(n => !n.isRead).length})
          </button>
          <button
            onClick={() => setFilterType('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'read'
                ? 'bg-[#014f86] dark:bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Lidas ({notifications.filter(n => n.isRead).length})
          </button>
        </div>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 border transition-shadow duration-300 hover:shadow-xl dark:hover:shadow-gray-900/20 ${
              notification.isRead 
                ? 'border-gray-200 dark:border-gray-700' 
                : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            {/* Indicador de não lida */}
            {!notification.isRead && (
              <div className="absolute -left-1 top-4 w-3 h-3 bg-blue-500 rounded-full"></div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2 sm:gap-0">
              <h2 className={`text-base sm:text-lg font-semibold pr-2 ${
                notification.isRead 
                  ? 'text-gray-800 dark:text-gray-100' 
                  : 'text-gray-900 dark:text-white font-bold'
              }`}>
                {notification.subject}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">{notification.sentDate}</span>
                <button
                  onClick={() => toggleReadStatus(notification.id)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    notification.isRead
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  {notification.isRead ? 'Marcar como não lida' : 'Marcar como lida'}
                </button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 text-sm sm:text-base">{notification.content}</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                variant="outline"
                className="text-white bg-[#014f86] border-[#014f86] hover:bg-[#012d4a] hover:text-white dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-700 transition-colors w-full sm:w-auto"
                onClick={() => handleView(notification)}
              >
                Visualizar
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors w-full sm:w-auto"
                onClick={() => handleDelete(notification.id)}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))
        )}
      </div>
      <CustomModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedNotification?.subject || "Detalhes da Notificação"}
      >
        <div className="mt-4 text-gray-700 dark:text-gray-200">
          <p className="mb-2 text-sm sm:text-base"><strong>Data:</strong> {selectedNotification?.sentDate}</p>
          <p className="mb-4 text-sm sm:text-base"><strong>Assunto:</strong> {selectedNotification?.subject}</p>
          <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed">{selectedNotification?.content}</p>
        </div>
      </CustomModal>
    </div>
  );
}

export const dynamic = 'force-dynamic';