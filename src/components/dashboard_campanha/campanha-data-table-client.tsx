'use client';

import { CampanhaDataTable } from '@/components/dashboard_campanha/campanha-data-table';
import { NovaCampanhaModal } from '@/components/dashboard_campanha/nova-campanha-modal';
import { CampanhaStartup, StartupFilters } from '@/types/startup';
import { useState } from 'react';

interface CampanhaComStartup extends CampanhaStartup {
  startup: {
    id: number;
    nome: string;
    area_atuacao: string;
    status: string;
  };
}

interface CampanhaDataTableClientProps {
  initialData: CampanhaComStartup[];
  totalCount: number;
  initialFilters: StartupFilters;
  startupId: number;
  startupNome: string;
  startupEstagio?: string;
}

export function CampanhaDataTableClient({
  initialData,
  totalCount,
  initialFilters,
  startupId,
  startupNome,
  startupEstagio,
}: CampanhaDataTableClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <CampanhaDataTable
        initialData={initialData}
        totalCount={totalCount}
        initialFilters={initialFilters}
        onNovaCampanhaClick={() => setModalOpen(true)}
      />
      <NovaCampanhaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        startupId={startupId}
        startupNome={startupNome}
        startupEstagio={startupEstagio}
      />
    </>
  );
}
